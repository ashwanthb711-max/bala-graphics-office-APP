BALA GRAPHICS OFFICE APP — QUICK START (WINDOWS)
================================================

WHAT IS INCLUDED
- Responsive website for office computer and mobile browser.
- Customer order requests saved to the server.
- Office order entry with dimensions, quantity, price, advance, notes and due date.
- Order tracking: New, Designing, Waiting for approval, Approved, Printing, Ready for pickup, Delivered, Cancelled.
- Payment recording with payment method and payment history.
- Printable invoice (Print / Save as PDF).
- Export order list to CSV and download/restore JSON backup.
- AI Design Studio endpoint. AI image generation works only after you configure an OpenAI API key and have API access/billing enabled.

RUN ON YOUR WINDOWS COMPUTER
1. Download and extract BalaGraphicsOfficeApp.zip to a normal folder, e.g. Desktop.
2. Install Node.js LTS from https://nodejs.org/ if it is not already installed.
3. Double-click start.bat. Keep the black terminal window open.
4. Open Google Chrome and visit http://localhost:3000
5. Click Office Manager to create and manage jobs.

USE FROM YOUR PHONE ON THE SAME WI-FI
1. Start the app on the office computer first.
2. In the terminal, find a line like: Phone on same Wi-Fi: http://192.168.1.5:3000
3. On your phone, connect to the same Wi-Fi and open that exact address in Chrome.
4. If Windows Firewall asks, allow Node.js on your private network only.
5. You can use the browser menu to Add to Home screen / Install app if supported.

OPTIONAL AI IMAGE GENERATION SETUP
1. Create an OpenAI API key in your OpenAI developer account. API usage may cost money and is separate from a ChatGPT subscription.
2. Set the environment variable OPENAI_API_KEY before starting the app. For a one-time Windows Command Prompt session:
   set OPENAI_API_KEY=your_key_here
   node server.js
   (Run these commands in the app folder instead of double-clicking start.bat.)
3. Restart the server and use AI Design Studio. Never share your API key or put it in the HTML file.

DATA AND PRIVACY IMPORTANT
- Order data is stored in data/office-data.json on the office computer. Back it up regularly using Office Manager > Download data backup.
- This simple starter has no login or role-based access. Use it only on a trusted private network. Do not expose port 3000 directly to the public internet.
- To access from outside the office or support multiple remote offices, deploy behind HTTPS with authentication and a proper database before using real customer records.
- The app stores orders and payment records, but it is not a tax-compliant GST/accounting system. Confirm invoice/tax requirements with your accountant.
- Uploading a file in the customer request form is not an online file transfer; the file name is noted and the customer must attach it separately in WhatsApp.
- A local server must remain running for shared order data and AI generation. The app is not a cloud-hosted public URL yet.

BACKUP
Use Office Manager > Download data backup. Keep copies in a safe location. Restore replaces the current order list, so export the current data before restoring an older backup.
