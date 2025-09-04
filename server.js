import express from "express";
import cors from "cors";
import africastalking from "africastalking";

const app = express();
app.use(cors());
app.use(express.json());

// --- Africa's Talking Setup ---
const africasTalking = africastalking({
  apiKey: "YOUR_API_KEY",   // replace with your Sandbox/Live API key
  username: "sandbox"       // use 'sandbox' for testing
});

const sms = africasTalking.SMS;

// --- API Route to Send SMS ---
app.post("/send-sms", async (req, res) => {
  const { phoneNumbers, message } = req.body;

  try {
    const response = await sms.send({
      to: phoneNumbers,   // array: ["+2547XXXXXXX"]
      message: message,
      from: "MYAPP"       // optional Sender ID
    });

    res.json({ success: true, response });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Start Server ---
const PORT = 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
