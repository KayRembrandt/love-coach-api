app.post("/waitlist", async (req, res) => {
  try {
    console.log("➡️ Incoming /waitlist payload:", req.body);

    // Try to catch different possible field names
    const { email, first_name, firstName, name } = req.body;

    if (!email) {
      console.error("❌ Missing email");
      return res.status(400).json({ error: "Email is required" });
    }

    const finalFirstName = firstName || first_name || name || null;

    const { data, error } = await supabase
      .from("waitlist")
      .insert([
        {
          email: email.trim().toLowerCase(),
          first_name: finalFirstName,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase Waitlist Insert Error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        body: req.body,
      });
      return res.status(500).json({ error: error.message });
    }

    console.log("✅ Waitlist row inserted:", data);
    res.json({ success: true, data });
  } catch (err) {
    console.error("💥 Waitlist route error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});
