const express = require("express");
const DB = require("./DB");
const cors = require("cors");
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/api/test_", async (req, res) => {
  try {
    const sql = `SELECT user.u_id, user.u_name, user.u_surname, user.password, role.role, status.status FROM user
    INNER JOIN role ON user.role = role.r_id
    INNER JOIN status ON user.status = status.s_id;`;
    const [products] = await DB.query(sql);
    res.json(products);
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
    if (user.status !== "Ready"){
      return res.json({
        success: false,
        message: "บัญชีผู้ใช้นี้ถูกระงับการใช้งาน",
      });
    }

    // Login สำเร็จ
    res.json({
      success: true,
      message: "Login Success",
      user: {
        id: user.u_id,
        name: user.u_name,
        surname: user.u_surname,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
