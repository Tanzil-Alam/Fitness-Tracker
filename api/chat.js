module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            body = {};
        }
    }

    const message = body?.message;
    if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        res.status(500).json({ 
            error: 'GEMINI_API_KEY is not configured in Vercel Environment Variables. Please add it in your Vercel Project Settings.' 
        });
        return;
    }

    const systemPrompt = "You are the AI assistant inside FitPulse, an Activity Heatmap & Fitness Tracker app. Your role is to answer fitness, workout, and health questions for the user concisely and directly. Always keep your responses very short, clear, and to the point (maximum 2-3 sentences).";

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: systemPrompt }]
                },
                contents: [
                    { role: "user", parts: [{ text: message }] }
                ]
            })
        });

        const data = await response.json();

        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) {
            res.status(200).json({ reply: data.candidates[0].content.parts[0].text });
        } else if (data.error) {
            res.status(500).json({ error: data.error.message });
        } else {
            res.status(500).json({ error: 'Sorry, I could not process that response.' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Error connecting to Gemini API: ' + err.message });
    }
};
