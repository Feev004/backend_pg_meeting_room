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

// ==================== BOOKING APIs (use_meeting_room) ====================

// GET all bookings with optional filtering (?r_id=...&u_id=...&use_date=...&status=...)
app.get(["/api/booking", "/api/use_meeting_room"], async (req, res) => {
  try {
    const { r_id, u_id, use_date, status } = req.query;
    let sql = `
      SELECT 
        use_meeting_room.r_id,
        meeting_room.r_name,
        use_meeting_room.u_id,
        user.u_name,
        user.u_surname,
        DATE_FORMAT(use_meeting_room.Borrowed_time, '%H:%i:%s') AS Borrowed_time,
        DATE_FORMAT(use_meeting_room.F_time, '%H:%i:%s') AS F_time,
        DATE_FORMAT(use_meeting_room.E_time, '%H:%i:%s') AS E_time,
        DATE_FORMAT(use_meeting_room.now_date, '%Y-%m-%d') AS now_date,
        DATE_FORMAT(use_meeting_room.use_date, '%Y-%m-%d') AS use_date,
        use_meeting_room.status,
        status.status AS status_name
      FROM use_meeting_room
      LEFT JOIN meeting_room ON use_meeting_room.r_id = meeting_room.r_id
      LEFT JOIN user ON use_meeting_room.u_id = user.u_id
      LEFT JOIN status ON use_meeting_room.status = status.s_id
      WHERE 1=1
    `;
    const params = [];

    if (r_id !== undefined && r_id !== "") {
      sql += " AND use_meeting_room.r_id = ?";
      params.push(r_id);
    }
    if (u_id !== undefined && u_id !== "") {
      sql += " AND use_meeting_room.u_id = ?";
      params.push(u_id);
    }
    if (use_date !== undefined && use_date !== "") {
      sql += " AND use_meeting_room.use_date = ?";
      params.push(use_date);
    }
    if (status !== undefined && status !== "") {
      sql += " AND use_meeting_room.status = ?";
      params.push(status);
    }

    sql += " ORDER BY use_meeting_room.use_date DESC, use_meeting_room.F_time ASC";

    const [rows] = await DB.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET bookings by user id
app.get("/api/booking/user/:u_id", async (req, res) => {
  try {
    const { u_id } = req.params;
    const sql = `
      SELECT 
        use_meeting_room.r_id,
        meeting_room.r_name,
        use_meeting_room.u_id,
        user.u_name,
        user.u_surname,
        DATE_FORMAT(use_meeting_room.Borrowed_time, '%H:%i:%s') AS Borrowed_time,
        DATE_FORMAT(use_meeting_room.F_time, '%H:%i:%s') AS F_time,
        DATE_FORMAT(use_meeting_room.E_time, '%H:%i:%s') AS E_time,
        DATE_FORMAT(use_meeting_room.now_date, '%Y-%m-%d') AS now_date,
        DATE_FORMAT(use_meeting_room.use_date, '%Y-%m-%d') AS use_date,
        use_meeting_room.status,
        status.status AS status_name
      FROM use_meeting_room
      LEFT JOIN meeting_room ON use_meeting_room.r_id = meeting_room.r_id
      LEFT JOIN user ON use_meeting_room.u_id = user.u_id
      LEFT JOIN status ON use_meeting_room.status = status.s_id
      WHERE use_meeting_room.u_id = ?
      ORDER BY use_meeting_room.use_date DESC, use_meeting_room.F_time ASC
    `;
    const [rows] = await DB.query(sql, [u_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET bookings by room id
app.get("/api/booking/room/:r_id", async (req, res) => {
  try {
    const { r_id } = req.params;
    const { use_date } = req.query;
    let sql = `
      SELECT 
        use_meeting_room.r_id,
        meeting_room.r_name,
        use_meeting_room.u_id,
        user.u_name,
        user.u_surname,
        DATE_FORMAT(use_meeting_room.Borrowed_time, '%H:%i:%s') AS Borrowed_time,
        DATE_FORMAT(use_meeting_room.F_time, '%H:%i:%s') AS F_time,
        DATE_FORMAT(use_meeting_room.E_time, '%H:%i:%s') AS E_time,
        DATE_FORMAT(use_meeting_room.now_date, '%Y-%m-%d') AS now_date,
        DATE_FORMAT(use_meeting_room.use_date, '%Y-%m-%d') AS use_date,
        use_meeting_room.status,
        status.status AS status_name
      FROM use_meeting_room
      LEFT JOIN meeting_room ON use_meeting_room.r_id = meeting_room.r_id
      LEFT JOIN user ON use_meeting_room.u_id = user.u_id
      LEFT JOIN status ON use_meeting_room.status = status.s_id
      WHERE use_meeting_room.r_id = ?
    `;
    const params = [r_id];

    if (use_date) {
      sql += " AND use_meeting_room.use_date = ?";
      params.push(use_date);
    }

    sql += " ORDER BY use_meeting_room.use_date DESC, use_meeting_room.F_time ASC";

    const [rows] = await DB.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create booking
app.post(["/api/booking", "/api/use_meeting_room"], async (req, res) => {
  try {
    let { r_id, u_id, use_date, F_time, E_time, Borrowed_time, now_date, status } = req.body;

    // If u_id is not provided in body, check cookie
    if (!u_id && req.cookies?.user?.id) {
      u_id = req.cookies.user.id;
    }

    if (r_id === undefined || !u_id || !use_date || !F_time || !E_time) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกข้อมูลให้ครบถ้วน (r_id, u_id, use_date, F_time, E_time)",
      });
    }

    if (F_time >= E_time) {
      return res.status(400).json({
        success: false,
        message: "เวลาเริ่มต้น (F_time) ต้องน้อยกว่าเวลาสิ้นสุด (E_time)",
      });
    }

    // Default now_date if not provided
    if (!now_date) {
      const now = new Date();
      now_date = now.toISOString().slice(0, 10);
    }

    // Default Borrowed_time if not provided
    if (!Borrowed_time) {
      const now = new Date();
      Borrowed_time = now.toTimeString().split(" ")[0];
    }

    if (status === undefined || status === null) {
      status = 0; // Ready / Active
    }

    // Check overlapping bookings for the same room on the same date with active status (status = 0)
    const overlapSql = `
      SELECT * FROM use_meeting_room 
      WHERE r_id = ? 
        AND use_date = ? 
        AND status = 0
        AND (F_time < ? AND E_time > ?)
    `;
    const [overlapRows] = await DB.query(overlapSql, [r_id, use_date, E_time, F_time]);

    if (overlapRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "ห้องประชุมนี้ถูกจองในช่วงเวลาดังกล่าวแล้ว กรุณาเลือกช่วงเวลาอื่น",
        overlapping: overlapRows,
      });
    }

    // Insert new booking
    const insertSql = `
      INSERT INTO use_meeting_room (r_id, u_id, Borrowed_time, F_time, status, now_date, use_date, E_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await DB.query(insertSql, [
      r_id,
      u_id,
      Borrowed_time,
      F_time,
      status,
      now_date,
      use_date,
      E_time,
    ]);

    res.json({
      success: true,
      message: "จองห้องประชุมสำเร็จ",
      booking: {
        r_id,
        u_id,
        Borrowed_time,
        F_time,
        status,
        now_date,
        use_date,
        E_time,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update booking status (e.g. cancel or change status)
app.put("/api/booking/status", async (req, res) => {
  try {
    const { r_id, u_id, use_date, F_time, status } = req.body;

    if (r_id === undefined || !u_id || !use_date || !F_time || status === undefined) {
      return res.status(400).json({
        success: false,
        message: "กรุณาระบุข้อมูลให้ครบถ้วน (r_id, u_id, use_date, F_time, status)",
      });
    }

    const sql = `
      UPDATE use_meeting_room 
      SET status = ? 
      WHERE r_id = ? AND u_id = ? AND use_date = ? AND F_time = ?
    `;
    const [result] = await DB.query(sql, [status, r_id, u_id, use_date, F_time]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลการจองที่ต้องการแก้ไข",
      });
    }

    res.json({
      success: true,
      message: "อัปเดตสถานะการจองสำเร็จ",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE booking
app.delete("/api/booking", async (req, res) => {
  try {
    const data = req.body.r_id !== undefined ? req.body : req.query;
    const { r_id, u_id, use_date, F_time } = data;

    if (r_id === undefined || !u_id || !use_date || !F_time) {
      return res.status(400).json({
        success: false,
        message: "กรุณาระบุข้อมูลให้ครบถ้วน (r_id, u_id, use_date, F_time)",
      });
    }

    const sql = `
      DELETE FROM use_meeting_room 
      WHERE r_id = ? AND u_id = ? AND use_date = ? AND F_time = ?
    `;
    const [result] = await DB.query(sql, [r_id, u_id, use_date, F_time]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบข้อมูลการจองที่ต้องการลบ",
      });
    }

    res.json({
      success: true,
      message: "ยกเลิก/ลบการจองสำเร็จ",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================

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
