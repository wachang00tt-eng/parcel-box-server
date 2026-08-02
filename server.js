require("dotenv").config();

const express = require("express");
const axios = require("axios");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

// ===========================
// หน้าแรก
// ===========================
app.get("/", (req, res) => {
  res.send("📦 Parcel Box Server is Running");
});

// ===========================
// Health Check
// ===========================
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    server: "Parcel Box",
    time: new Date().toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok"
    })
  });
});

// ===========================
// รับข้อมูลจาก ESP32
// ===========================
app.post("/webhook", async (req, res) => {

  try {

    const message = req.body.message || "พบพัสดุ";
    const distance = req.body.distance || 0;

    const text =
`📦 แจ้งเตือนกล่องพัสดุ

${message}

📏 ระยะ : ${distance} cm

🕒 ${new Date().toLocaleString("th-TH",{
timeZone:"Asia/Bangkok"
})}`;

    await axios.post(
      "https://api.line.me/v2/bot/message/push",
      {
        to: process.env.USER_ID,
        messages: [
          {
            type: "text",
            text: text
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`,
          "Content-Type":"application/json"
        }
      }
    );

    console.log("LINE SENT");

    res.json({
      success:true
    });

  }
  catch(error){

    console.log(error.response?.data || error.message);

    res.status(500).json({
      success:false
    });

  }

});

// ===========================

app.listen(PORT,()=>{

  console.log("================================");
  console.log("Parcel Box Server Started");
  console.log("Port :",PORT);
  console.log("================================");

});
