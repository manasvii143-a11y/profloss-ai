
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "The AI API key is not configured."
      });
    }

    const { message, history = [] } = req.body || {};

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 4000
    ) {
      return res.status(400).json({
        error: "Please enter a valid message."
      });
    }

    const previousMessages = Array.isArray(history)
      ? history
          .filter(
            item =>
              item &&
              ["user", "assistant"].includes(item.role) &&
              typeof item.content === "string"
          )
          .slice(-10)
          .map(item => ({
            role: item.role,
            content: item.content.slice(0, 4000)
          }))
      : [];

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-5-mini",
          instructions:
            "You are the AI business assistant for Profloss AI. " +
            "Give clear, practical business advice. Do not invent " +
            "financial figures or claim access to data you have not received.",
          input: [
            ...previousMessages,
            { role: "user", content: message.trim() }
          ],
          max_output_tokens: 700
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API request failed:", data.error?.message);
      return res.status(502).json({
        error: "The AI service could not respond. Please try again."
      });
    }

    const reply = (data.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n");

    if (!reply) {
      return res.status(502).json({
        error: "The AI returned an empty response."
      });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Chat API error:", error.message);
    return res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
};
