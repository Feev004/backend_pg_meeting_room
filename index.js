require("dotenv").config();
const express = require("express");
const DB = require("./DB");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const app = express();
const port = process.env.PORT || 8000;

// app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000", // Frontend
    credentials: true,
  }),
);

app.get("/", (req, res) => {
  res.json({ success: true, message: "Backend API is running" });
});

app.get("/api/test_", async (req, res) => {
  try {
    const sql = `SELECT user.u_id, user.u_name, user.u_surname, status.status FROM user
    INNER JOIN role ON user.role = role.r_id
    INNER JOIN status ON user.status = status.s_id;`;
    const [products] = await DB.query(sql);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/meet", async (req, res) => {
  try {
    const sql = `SELECT meeting_room.r_id, meeting_room.r_name, status.status FROM meeting_room
    INNER JOIN status on meeting_room.status = status.s_id`;
    const [products] = await DB.query(sql);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/meet/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `SELECT meeting_room.r_id, meeting_room.r_name, status.status FROM meeting_room
    INNER JOIN status on meeting_room.status = status.s_id WHERE meeting_room.r_id = ?`;
    const [products] = await DB.query(sql, [id]);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/status", async (req, res) => {
  try {
    const sql = `SELECT * FROM status`;
    const [products] = await DB.query(sql);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put("/api/meet/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { r_name, status } = req.body;
    console.log(req.body);
    console.log("id:", id, "r_name:", r_name, "status:", status);
    const sql = `UPDATE meeting_room SET r_id = ?, r_name = ?, status = ? WHERE r_id = ?`;
    const [result] = await DB.query(sql, [id, r_name, status, id]);
    res.json({ success: true, message: "Update Success" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const sql = `
      SELECT user.u_id, user.u_name, user.u_surname, user.password, role.role, status.status
      FROM user
      INNER JOIN role ON user.role = role.r_id
      INNER JOIN status ON user.status = status.s_id
      WHERE user.u_name = ?;
    `;

    const [rows] = await DB.query(sql, [username]);
    // ไม่พบ Username
    if (rows.length === 0) {
      return res.json({
        success: false,
        message: "ไม่พบ Username",
      });
    }
    const user = rows[0];
    // Password ไม่ถูก
    if (user.password !== password) {
      return res.json({
        success: false,
        message: "Password ไม่ถูกต้อง",
      });
    }
    if (user.status !== "Ready") {
      return res.json({
        success: false,
        message: "บัญชีผู้ใช้นี้ถูกระงับการใช้งาน",
      });
    }

    const userData = {
      id: user.u_id,
      name: user.u_name,
      surname: user.u_surname,
      role: user.role,
      status: user.status,
    };

    res.cookie("user", userData, {
      httpOnly: true, // JS ฝั่ง Browser อ่านไม่ได้
      secure: false, // true เมื่อใช้ HTTPS
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24, // 1 วัน
    });

    res.json({
      success: true,
      message: "Login Success",
      user: userData,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
app.get("/profile", (req, res) => {
  const user = req.cookies.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Not Login",
    });
  }

  res.json({
    success: true,
    user,
  });
});
app.post("/logout", (req, res) => {
  res.clearCookie("user");

  res.json({
    success: true,
    message: "Logout Success",
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
