const fs = require('fs');

try {
    const imageBuffer = fs.readFileSync('gadennis-signature-image-png-27.png');
    const base64String = imageBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64String}`;
    
    console.log('Base64 Data URL:');
    console.log(dataUrl);
    
    // Also save to a file for easy copying
    fs.writeFileSync('signature-base64.txt', dataUrl);
    console.log('\nBase64 data URL saved to signature-base64.txt');
    
} catch (error) {
    console.error('Error converting image:', error.message);
}