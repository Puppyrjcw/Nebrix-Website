// ── ADD THIS to server.js (after the /login route) ───────────────────────────
// Change password endpoint
app.post("/change-password", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer "))
    return res.status(401).json({ error: "Unauthorized" });

  const token = auth.slice(7);
  let userId;
  try {
    const decoded = jwt.verify(token, SECRET);
    userId = decoded.id;
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: "Missing fields" });
  if (newPassword.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters" });

  db.get("SELECT password FROM users WHERE id = ?", [userId], async (err, row) => {
    if (err || !row) return res.status(404).json({ error: "User not found" });

    const match = await bcrypt.compare(currentPassword, row.password);
    if (!match) return res.status(400).json({ error: "Current password is incorrect" });

    const hashed = await bcrypt.hash(newPassword, 10);
    db.run("UPDATE users SET password = ? WHERE id = ?", [hashed, userId], (err2) => {
      if (err2) return res.status(500).json({ error: "Failed to update password" });
      res.json({ message: "Password changed successfully" });
    });
  });
});
