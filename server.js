const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https:", "http:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:", "http:"],
      frameSrc: ["'self'", "https:"],
    },
  },
}));

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Serve Supabase config for frontend
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY
  });
});

// Generate unique tracking ID with ESP-XXXXXXXXXX format (numeric only after prefix)
function generateTrackingId() {
  const randomNumber = Math.floor(1000000000 + Math.random() * 9000000000); // 10-digit number
  return `ESP-${randomNumber}`;
}

// Send package status update notifications
async function sendPackageStatusNotifications(packageData, newStatus, isFirstProcessing = false) {
  try {
    const trackingUrl = `https://emilshipping.com`;
    
    // Check if this is the first "Processing" status update
    if (isFirstProcessing && newStatus.toLowerCase() === 'processing') {
      // Send to BOTH sender and receiver for first "Processing" status
      
      // Sender email template for Processing confirmation
      const senderEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">Emil Shipping</h1>
            <p style="color: #6b7280; margin: 5px 0;">Professional Freight & Logistics</p>
          </div>
          
          <h2 style="color: #374151;">Package Processing Confirmation</h2>
          
          <p>Dear ${packageData.sender_name || 'Valued Customer'},</p>
          
          <p>We're pleased to confirm that your package has been processed and is getting ready for shipment.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #374151;">Package Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 5px 0; font-weight: bold;">Tracking ID:</td><td style="padding: 5px 0;">${packageData.tracking_id}</td></tr>
              <tr><td style="padding: 5px 0; font-weight: bold;">Status:</td><td style="padding: 5px 0;">Processing</td></tr>
              <tr><td style="padding: 5px 0; font-weight: bold;">Destination:</td><td style="padding: 5px 0;">${packageData.destination}</td></tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${trackingUrl}" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Track Your Package
            </a>
          </div>
          
          <p>You can track your package anytime at: <strong>${trackingUrl}</strong></p>
          <p>Tracking ID: <strong>${packageData.tracking_id}</strong></p>
          
          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; color: #6b7280; font-size: 14px;">
            <p>Thank you for choosing Emil Shipping!</p>
            <p style="margin: 0;">Best regards,<br>Emil Shipping Team</p>
          </div>
        </div>
      `;

      // Receiver email template for incoming package notification
      const receiverEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">Emil Shipping</h1>
            <p style="color: #6b7280; margin: 5px 0;">Professional Freight & Logistics</p>
          </div>
          
          <h2 style="color: #374151;">Incoming Package Notification</h2>
          
          <p>Dear ${packageData.receiver_name || 'Valued Customer'},</p>
          
          <p>A package is being shipped to you and is currently being processed for delivery.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #374151;">Package Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 5px 0; font-weight: bold;">Tracking ID:</td><td style="padding: 5px 0;">${packageData.tracking_id}</td></tr>
              <tr><td style="padding: 5px 0; font-weight: bold;">From:</td><td style="padding: 5px 0;">${packageData.sender_name || 'Sender'}</td></tr>
              <tr><td style="padding: 5px 0; font-weight: bold;">Origin:</td><td style="padding: 5px 0;">${packageData.origin}</td></tr>
              <tr><td style="padding: 5px 0; font-weight: bold;">Status:</td><td style="padding: 5px 0;">Processing</td></tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${trackingUrl}" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Track Your Package
            </a>
          </div>
          
          <p>You can track this package anytime at: <strong>${trackingUrl}</strong></p>
          <p>Tracking ID: <strong>${packageData.tracking_id}</strong></p>
          
          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; color: #6b7280; font-size: 14px;">
            <p>Thank you for choosing Emil Shipping!</p>
            <p style="margin: 0;">Best regards,<br>Emil Shipping Team</p>
          </div>
        </div>
      `;

      // Send to sender
      if (packageData.sender_email) {
        await resend.emails.send({
          from: process.env.COMPANY_EMAIL || 'noreply@emilshipping.com',
          to: packageData.sender_email,
          subject: 'Confirmation that the package is processed',
          html: senderEmailHtml
        });
        console.log(`📧 Processing confirmation sent to sender: ${packageData.sender_email}`);
      }

      // Send to receiver
      if (packageData.receiver_email) {
        await resend.emails.send({
          from: process.env.COMPANY_EMAIL || 'noreply@emilshipping.com',
          to: packageData.receiver_email,
          subject: 'Notification of incoming package',
          html: receiverEmailHtml
        });
        console.log(`📧 Incoming package notification sent to receiver: ${packageData.receiver_email}`);
      }

    } else {
      // For all subsequent status updates, send ONLY to receiver
      const receiverStatusUpdateHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">Emil Shipping</h1>
            <p style="color: #6b7280; margin: 5px 0;">Professional Freight & Logistics</p>
          </div>
          
          <h2 style="color: #374151;">Package Status Update</h2>
          
          <p>Dear ${packageData.receiver_name || 'Valued Customer'},</p>
          
          <p>Your package status has been updated.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #374151;">Current Status:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 5px 0; font-weight: bold;">Tracking ID:</td><td style="padding: 5px 0;">${packageData.tracking_id}</td></tr>
              <tr><td style="padding: 5px 0; font-weight: bold;">Status:</td><td style="padding: 5px 0; color: #2563eb; font-weight: bold;">${newStatus}</td></tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${trackingUrl}" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Track Your Package
            </a>
          </div>
          
          <p>You can track your package anytime at: <strong>${trackingUrl}</strong></p>
          <p>Tracking ID: <strong>${packageData.tracking_id}</strong></p>
          
          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; color: #6b7280; font-size: 14px;">
            <p>Thank you for choosing Emil Shipping!</p>
            <p style="margin: 0;">Best regards,<br>Emil Shipping Team</p>
          </div>
        </div>
      `;

      // Send only to receiver for subsequent updates
      if (packageData.receiver_email) {
        await resend.emails.send({
          from: process.env.COMPANY_EMAIL || 'noreply@emilshipping.com',
          to: packageData.receiver_email,
          subject: 'Updated package status',
          html: receiverStatusUpdateHtml
        });
        console.log(`📧 Status update sent to receiver: ${packageData.receiver_email} - Status: ${newStatus}`);
      }
    }

    return { success: true, message: 'Status update notifications sent successfully' };
  } catch (error) {
    console.error('Status update email error:', error);
    // Fallback to console logging if Resend fails
    console.log('\n=== PACKAGE STATUS UPDATE NOTIFICATION (FALLBACK) ===');
    console.log(`Tracking ID: ${packageData.tracking_id}`);
    console.log(`New Status: ${newStatus}`);
    console.log(`Sender: ${packageData.sender_email}`);
    console.log(`Receiver: ${packageData.receiver_email}`);
    console.log(`Is First Processing: ${isFirstProcessing}`);
    console.log('====================================================\n');
    return { success: false, error: error.message };
  }
}

// Send email notifications using Resend
async function sendPackageNotifications(senderEmail, receiverEmail, trackingId, packageDetails) {
  try {
    const trackingUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/track?id=${trackingId}`;
    
    // Email template for both sender and receiver
    const createEmailHtml = (recipientType, recipientName) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">Emil Shipping</h1>
          <p style="color: #6b7280; margin: 5px 0;">Professional Freight & Logistics</p>
        </div>
        
        <h2 style="color: #374151;">Hello ${recipientName}!</h2>
        
        ${recipientType === 'sender' ? 
          '<p>Your package has been successfully created and is now being processed by Emil Shipping.</p>' :
          '<p>A package has been sent to you and is now being processed by Emil Shipping.</p>'
        }
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #374151;">Package Details:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 5px 0; font-weight: bold;">Tracking ID:</td><td style="padding: 5px 0;">${trackingId}</td></tr>
            <tr><td style="padding: 5px 0; font-weight: bold;">Description:</td><td style="padding: 5px 0;">${packageDetails.description}</td></tr>
            <tr><td style="padding: 5px 0; font-weight: bold;">Origin:</td><td style="padding: 5px 0;">${packageDetails.origin}</td></tr>
            <tr><td style="padding: 5px 0; font-weight: bold;">Destination:</td><td style="padding: 5px 0;">${packageDetails.destination}</td></tr>
            <tr><td style="padding: 5px 0; font-weight: bold;">Weight:</td><td style="padding: 5px 0;">${packageDetails.weight} kg</td></tr>
            <tr><td style="padding: 5px 0; font-weight: bold;">Status:</td><td style="padding: 5px 0;">Package Created</td></tr>
          </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${trackingUrl}" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Track Your Package
          </a>
        </div>
        
        <p>You can track your package anytime by visiting our website and entering the tracking ID: <strong>${trackingId}</strong></p>
        
        <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; color: #6b7280; font-size: 14px;">
          <p>Thank you for choosing Emil Shipping!</p>
          <p style="margin: 0;">Best regards,<br>Emil Shipping Team</p>
        </div>
      </div>
    `;

    const subject = `Package Notification - Tracking ID: ${trackingId}`;

    // Send email to sender
    if (senderEmail) {
      await resend.emails.send({
        from: process.env.COMPANY_EMAIL || 'noreply@emilshipping.com',
        to: senderEmail,
        subject: `Package Created - ${subject}`,
        html: createEmailHtml('sender', packageDetails.senderName || 'Valued Customer')
      });
      console.log(`📧 Sender notification sent to: ${senderEmail}`);
    }

    // Send email to receiver
    await resend.emails.send({
      from: process.env.COMPANY_EMAIL || 'noreply@emilshipping.com',
      to: receiverEmail,
      subject: `Package Incoming - ${subject}`,
      html: createEmailHtml('receiver', packageDetails.receiverName || 'Valued Customer')
    });
    console.log(`📧 Receiver notification sent to: ${receiverEmail}`);

    return { success: true, message: 'Email notifications sent successfully' };
  } catch (error) {
    console.error('Email error:', error);
    // Fallback to console logging if Resend fails
    console.log('\n=== EMAIL NOTIFICATION (FALLBACK) ===');
    console.log(`Sender: ${senderEmail}`);
    console.log(`Receiver: ${receiverEmail}`);
    console.log(`Tracking ID: ${trackingId}`);
    console.log(`Package: ${JSON.stringify(packageDetails, null, 2)}`);
    console.log('=====================================\n');
    return { success: false, error: error.message };
  }
}

// API Routes

// Create new package
app.post('/api/packages', async (req, res) => {
  try {
    const { 
      senderName, 
      senderEmail,
      senderAddress,
      senderPhone,
      receiverName,
      receiverEmail,
      receiverAddress,
      receiverPhone,
      packageDescription,
      origin,
      destination,
      packageQuantity,
      weight,
      totalCharges
    } = req.body;

    // Validation
    if (!receiverEmail || !receiverName || !origin || !destination) {
      return res.status(400).json({ 
        error: 'Receiver name, receiver email, origin, and destination are required' 
      });
    }

    const trackingId = generateTrackingId();
    
    // Parse weight and total charges to extract numeric values
    const parsedWeight = weight ? parseFloat(weight.toString().replace(/[^\d.]/g, '')) || 0 : 0;
    const parsedTotalCharges = totalCharges ? parseFloat(totalCharges.toString().replace(/[^\d.]/g, '')) || 0 : 0;
    
    // Insert package into Supabase
    const { data: packageData, error: packageError } = await supabase
      .from('packages')
      .insert([{
        tracking_id: trackingId,
        sender_email: senderEmail || '',
        sender_name: senderName || 'Unknown Sender',
        sender_address: senderAddress || '',
        sender_phone: senderPhone || '',
        receiver_email: receiverEmail,
        receiver_name: receiverName,
        receiver_address: receiverAddress || '',
        receiver_phone: receiverPhone || '',
        origin,
        destination,
        package_description: packageDescription || 'Package',
        package_quantity: packageQuantity || 1,
        weight: parsedWeight,
        total_charges: parsedTotalCharges,
        status: 'pending'
      }])
      .select()
      .single();

    if (packageError) {
      console.error('Package creation error:', packageError);
      return res.status(500).json({ error: 'Failed to create package' });
    }

    // Add initial shipping update
    const { error: updateError } = await supabase
      .from('shipping_updates')
      .insert([{
        package_id: packageData.id,
        status: 'Package Created',
        location: 'Emil Shipping Warehouse',
        description: 'Package has been created and is being processed'
      }]);

    if (updateError) {
      console.error('Shipping update error:', updateError);
    }

    // Send email notifications
    const emailResult = await sendPackageNotifications(
      senderEmail,
      receiverEmail,
      trackingId,
      {
        senderName: senderName || 'Unknown Sender',
        receiverName,
        description: packageDescription || 'Package',
        origin,
        destination,
        weight: weight || 0
      }
    );

    res.status(201).json({
      success: true,
      trackingId,
      message: 'Package created successfully',
      emailStatus: emailResult
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get package tracking information
app.get('/api/tracking/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get package details
    const { data: packageData, error: packageError } = await supabase
      .from('packages')
      .select('*')
      .eq('tracking_id', id)
      .single();

    if (packageError || !packageData) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Get shipping updates
    const { data: updates, error: updatesError } = await supabase
      .from('shipping_updates')
      .select('*')
      .eq('package_id', packageData.id)
      .order('timestamp', { ascending: true });

    if (updatesError) {
      console.error('Updates fetch error:', updatesError);
      return res.status(500).json({ error: 'Failed to fetch shipping updates' });
    }

    // Format response to match frontend expectations
    const response = {
      id: packageData.tracking_id,
      trackingId: packageData.tracking_id,
      senderName: packageData.sender_name,
      senderEmail: packageData.sender_email,
      receiverName: packageData.receiver_name,
      receiverEmail: packageData.receiver_email,
      packageDescription: packageData.package_description,
      origin: packageData.origin,
      destination: packageData.destination,
      weight: packageData.weight,
      status: packageData.status,
      createdAt: packageData.created_at,
      updatedAt: packageData.updated_at,
      locationHistory: updates.map(update => ({
        location: update.location,
        status: update.status,
        description: update.description,
        timestamp: update.timestamp
      }))
    };

    res.json(response);

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all packages (for admin panel)
app.get('/api/packages', async (req, res) => {
  try {
    const { data: packages, error } = await supabase
      .from('packages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Packages fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch packages' });
    }

    res.json(packages);

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update package status and location
app.put('/api/packages/:id/location', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, location, description } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Get full package data including current status and email addresses
    const { data: packageData, error: packageError } = await supabase
      .from('packages')
      .select('*')
      .eq('tracking_id', id)
      .single();

    if (packageError || !packageData) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Check if this is the first time status is being set to "Processing"
    const isFirstProcessing = (
      status.toLowerCase() === 'processing' && 
      packageData.status.toLowerCase() !== 'processing'
    );

    // Check if this package has ever been set to "Processing" before
    const { data: existingProcessingUpdates, error: historyError } = await supabase
      .from('shipping_updates')
      .select('id')
      .eq('package_id', packageData.id)
      .ilike('status', '%processing%')
      .limit(1);

    // If no previous processing updates exist, this is truly the first processing
    const isFirstProcessingEver = !existingProcessingUpdates || existingProcessingUpdates.length === 0;
    const shouldSendProcessingEmails = isFirstProcessing && isFirstProcessingEver;

    // Add shipping update
    const { error: updateError } = await supabase
      .from('shipping_updates')
      .insert([{
        package_id: packageData.id,
        status,
        location: location || '',
        description: description || ''
      }]);

    if (updateError) {
      console.error('Shipping update error:', updateError);
      return res.status(500).json({ error: 'Failed to add shipping update' });
    }

    // Update package status
    const { error: statusError } = await supabase
      .from('packages')
      .update({ status: status.toLowerCase() })
      .eq('id', packageData.id);

    if (statusError) {
      console.error('Package status update error:', statusError);
    }

    // Send email notifications based on status update rules
    try {
      await sendPackageStatusNotifications(packageData, status, shouldSendProcessingEmails);
    } catch (emailError) {
      console.error('Email notification error:', emailError);
      // Don't fail the entire request if email fails
    }

    res.json({
      success: true,
      message: 'Package location updated successfully'
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete package (admin only)
app.delete('/api/packages/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('packages')
      .delete()
      .eq('tracking_id', id);

    if (error) {
      console.error('Package deletion error:', error);
      return res.status(500).json({ error: 'Failed to delete package' });
    }

    res.json({
      success: true,
      message: 'Package deleted successfully'
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send contact form email notifications
async function sendContactFormNotifications(contactData) {
  try {
    const { name, email, phone, subject, message } = contactData;
    
    // Email template for company notification
    const companyEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Contact Form Submission</title>
        <style>
          body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-row { margin: 15px 0; padding: 10px; background: white; border-radius: 5px; border-left: 4px solid #3b82f6; }
          .label { font-weight: 600; color: #1e40af; margin-bottom: 5px; }
          .value { color: #374151; }
          .message-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">📧 New Contact Form Submission</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Emil Shipping Website</p>
          </div>
          <div class="content">
            <div class="info-row">
              <div class="label">👤 Name:</div>
              <div class="value">${name}</div>
            </div>
            <div class="info-row">
              <div class="label">📧 Email:</div>
              <div class="value">${email}</div>
            </div>
            ${phone ? `<div class="info-row">
              <div class="label">📱 Phone:</div>
              <div class="value">${phone}</div>
            </div>` : ''}
            <div class="info-row">
              <div class="label">📋 Subject:</div>
              <div class="value">${subject || 'No subject specified'}</div>
            </div>
            <div class="message-box">
              <div class="label">💬 Message:</div>
              <div class="value" style="white-space: pre-wrap;">${message}</div>
            </div>
            <div class="footer">
              <p>This message was sent from the Emil Shipping contact form.</p>
              <p>Please respond to the customer at: <strong>${email}</strong></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Email template for customer confirmation
    const customerEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thank You for Contacting Emil Shipping</title>
        <style>
          body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .message-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .contact-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">🚢 Thank You for Contacting Us!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Emil Shipping</p>
          </div>
          <div class="content">
            <p>Dear ${name},</p>
            <p>Thank you for reaching out to Emil Shipping! We have received your message and our team will review it shortly.</p>
            
            <div class="message-box">
              <h3 style="margin-top: 0; color: #1e40af;">📋 Your Message Summary:</h3>
              <p><strong>Subject:</strong> ${subject || 'General Inquiry'}</p>
              <p><strong>Message:</strong></p>
              <p style="white-space: pre-wrap; background: #f3f4f6; padding: 15px; border-radius: 5px;">${message}</p>
            </div>

            <p>We typically respond to inquiries within 24 hours during business days. If your matter is urgent, please don't hesitate to call us directly.</p>

            <div class="contact-info">
              <h3 style="margin-top: 0; color: #1e40af;">📞 Contact Information:</h3>
              <p><strong>Email:</strong> info@emilshipping.com</p>
              <p><strong>Phone:</strong> +1-555-0123</p>
              <p><strong>Website:</strong> ${process.env.FRONTEND_URL || 'http://localhost:3000'}</p>
            </div>

            <p>Thank you for choosing Emil Shipping for your logistics needs!</p>
            
            <div class="footer">
              <p>Best regards,<br><strong>The Emil Shipping Team</strong></p>
              <p style="font-size: 12px; margin-top: 20px;">This is an automated confirmation email. Please do not reply to this message.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send notification to company
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'your_resend_api_key') {
      await resend.emails.send({
        from: process.env.COMPANY_EMAIL || 'noreply@emilshipping.com',
        to: process.env.COMPANY_EMAIL || 'info@emilshipping.com',
        subject: `New Contact Form: ${subject || 'General Inquiry'} - ${name}`,
        html: companyEmailHtml
      });
      console.log(`📧 Contact form notification sent to company`);

      // Send confirmation to customer
      await resend.emails.send({
        from: process.env.COMPANY_EMAIL || 'noreply@emilshipping.com',
        to: email,
        subject: 'Thank you for contacting Emil Shipping',
        html: customerEmailHtml
      });
      console.log(`📧 Contact form confirmation sent to: ${email}`);
    } else {
      // Fallback to console logging if Resend is not configured
      console.log('\n=== CONTACT FORM NOTIFICATION (FALLBACK) ===');
      console.log(`From: ${name} (${email})`);
      console.log(`Phone: ${phone || 'Not provided'}`);
      console.log(`Subject: ${subject || 'General Inquiry'}`);
      console.log(`Message: ${message}`);
      console.log('===============================================\n');
    }

    return { success: true, message: 'Contact form notifications sent successfully' };
  } catch (error) {
    console.error('Contact email error:', error);
    return { success: false, error: error.message };
  }
}

// Contact form submission
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    // Save to database
    const { error } = await supabase
      .from('contact_messages')
      .insert([{
        name,
        email,
        phone: phone || '',
        subject: subject || '',
        message
      }]);

    if (error) {
      console.error('Contact form error:', error);
      return res.status(500).json({ error: 'Failed to submit contact form' });
    }

    // Send email notifications
    const emailResult = await sendContactFormNotifications({
      name, email, phone, subject, message
    });

    res.json({
      success: true,
      message: 'Contact form submitted successfully',
      emailStatus: emailResult
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/track', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'track.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/services', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'services.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/gallery', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'gallery.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Emil Shipping server running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`👨‍💼 Admin Panel: http://localhost:${PORT}/admin`);
  console.log(`📦 Sample Tracking IDs: ESP-1234567890, ESP-2345678901, ESP-3456789012`);
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('⚠️  Warning: Supabase credentials not found in environment variables');
  }
  
  if (!process.env.RESEND_API_KEY) {
    console.log('⚠️  Warning: Resend API key not found - emails will be logged to console');
  }
});