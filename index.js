const express = require("express");
const DB = require("./DB");
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static("public"));

// app.get("/", (req, res) => {
//   res.send("Express.js server is running!");
// });

app.get("/api/test_", async (req, res) => {
  try {
    const sql =
      `SELECT user.u_id, user.u_name, user.u_surname, user.password, role.role, status.status FROM user
INNER JOIN role ON user.role = role.r_id
INNER JOIN status ON user.status = status.s_id;`
    const [products] = await DB.query(sql);
    // console.log("test",products);
    
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
