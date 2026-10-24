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

        if (body?.action === 'generate_plans') {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
                return;
            }

            const profile = body.profile && typeof body.profile === 'object' ? body.profile : {};
            const profileSummary = [
                typeof profile.name === 'string' ? `Name: ${profile.name.slice(0, 80)}` : null,
                typeof profile.age === 'string' || typeof profile.age === 'number' ? `Age: ${String(profile.age).slice(0, 3)}` : null,
                typeof profile.height === 'string' || typeof profile.height === 'number' ? `Height: ${String(profile.height).slice(0, 3)} cm` : null,
                typeof profile.weight === 'string' || typeof profile.weight === 'number' ? `Weight: ${String(profile.weight).slice(0, 3)} kg` : null
            ].filter(Boolean).join(', ');
            const recentWorkouts = Array.isArray(body.recentWorkouts)
                ? body.recentWorkouts.slice(0, 40).map(workout => ({
                    name: typeof workout?.name === 'string' ? workout.name.slice(0, 40) : 'Workout',
                    date: typeof workout?.date === 'string' ? workout.date.slice(0, 10) : '',
                    durationMinutes: Math.max(0, Math.min(1440, Number(workout?.durationMinutes) || 0)),
                    reps: Math.max(0, Math.min(100000, Number(workout?.reps) || 0)),
                    distanceKm: Math.max(0, Math.min(10000, Number(workout?.distanceKm) || 0))
                }))
                : [];
            const prompt = `Create today's four-workout plan and this month's activity goals for this user. Review the provided workout history to vary exercises, account for consistency and avoid repeating excessive loads. Respect the profile and keep the plan safe and realistic. Monthly goals should include push-ups and squats measured in reps, running measured in km, and optionally plank measured in minutes. Example goals may be around 1000 push-ups, 1000 squats, and 100 km running, but adapt targets to the user's actual history and ability. Return only valid JSON with this exact shape: {"dailyWorkouts":[{"name":"Push up|Squats|Plank|Pull-ups|Deadlift|Running","target":"short measurable target","reason":"short reason"}],"monthlyGoals":[{"name":"Push up|Squats|Plank|Pull-ups|Deadlift|Running","target":1000,"unit":"reps|km|minutes"}]}. Include exactly four daily workouts and at least three monthly goals. Profile: ${profileSummary || 'No profile supplied.'}. Recent workout logs (do not invent any): ${JSON.stringify(recentWorkouts)}`;

            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        system_instruction: {
                            parts: [{ text: 'You are FitPulse’s fitness planner. Build balanced beginner-safe plans from the provided facts only. Return only valid JSON.' }]
                        },
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: 'application/json' }
                    })
                });
                const data = await response.json();
                const responseText = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
                if (!response.ok || !responseText) {
                    res.status(502).json({ error: data.error?.message || 'The AI could not generate a workout plan.' });
                    return;
                }

                let plans;
                try {
                    plans = JSON.parse(responseText.replace(/^```(?:json)?\s*|\s*```$/g, ''));
                } catch (error) {
                    res.status(502).json({ error: 'The AI returned a plan in an unreadable format.' });
                    return;
                }
                res.status(200).json({ plans });
            } catch (error) {
                res.status(500).json({ error: 'Error generating workout plans: ' + error.message });
            }
            return;
        }

        const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
    }
    if (message.length > 2000) {
        res.status(400).json({ error: 'Message must be 2000 characters or fewer.' });
        return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        res.status(500).json({ 
            error: 'GEMINI_API_KEY is not configured in Vercel Environment Variables. Please add it in your Vercel Project Settings.' 
        });
        return;
    }

    const profile = body.userProfile && typeof body.userProfile === 'object' ? body.userProfile : {};
    const profileDetails = [
        typeof profile.name === 'string' ? `Name: ${profile.name.slice(0, 100)}` : null,
        typeof profile.age === 'string' || typeof profile.age === 'number' ? `Age: ${String(profile.age).slice(0, 3)}` : null,
        typeof profile.height === 'string' || typeof profile.height === 'number' ? `Height: ${String(profile.height).slice(0, 3)} cm` : null,
        typeof profile.weight === 'string' || typeof profile.weight === 'number' ? `Weight: ${String(profile.weight).slice(0, 3)} kg` : null
    ].filter(Boolean).join(', ');
    const history = Array.isArray(body.history)
        ? body.history
            .filter(item =>
                item &&
                (item.role === 'user' || item.role === 'model') &&
                typeof item.text === 'string' &&
                item.text.trim()
            )
            .slice(-12)
            .map(item => ({
                role: item.role,
                parts: [{ text: item.text.trim().slice(0, 2000) }]
            }))
        : [];
    const lastMessage = history[history.length - 1];
    if (!lastMessage || lastMessage.role !== 'user' || lastMessage.parts[0].text !== message) {
        history.push({ role: 'user', parts: [{ text: message }] });
    }
    const systemPrompt = `You are FitPulse's fitness assistant. Personalize practical fitness guidance using this profile when relevant: ${profileDetails || 'No profile details provided.'} Keep advice concise and safe, and do not diagnose medical conditions.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: systemPrompt }]
                },
                contents: history
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
