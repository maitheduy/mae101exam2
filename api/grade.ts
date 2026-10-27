function gradeLocally(userAnswer: string, questionData: any) {
  const cleanUser = (userAnswer || "").toLowerCase().replace(/\s+/g, "");
  const cleanKey = (questionData?.answerKey || "").toLowerCase().replace(/\s+/g, "");

  const numbers = (cleanKey.match(/-?\d+(?:\.\d+)?/g) || []);
  const isMatch =
    cleanUser.length > 0 &&
    (
      cleanUser.includes(cleanKey) ||
      cleanKey.includes(cleanUser) ||
      numbers.some((num: string) => cleanUser.includes(num))
    );

  return {
    score: isMatch ? 1 : 0,
    isCorrect: isMatch,
    aiFeedback: isMatch
      ? "Chấm điểm offline: Đáp số hoặc cách làm của bạn khớp với đáp án chuẩn. Đạt 1 điểm tối đa!"
      : `Chấm điểm offline: Đáp án bạn nhập chưa khớp với đáp án chuẩn (${questionData?.answerKey || "không có"}). Hãy xem lại lời giải chi tiết bên dưới.`,
    skillsIdentified: questionData?.topic ? [questionData.topic] : []
  };
}

function buildPrompt(questionData: any, userAnswer: string) {
  return `Bạn là giảng viên Toán cao cấp chấm bài MAE101.

Câu hỏi:
${questionData?.statement || ""}

Lời giải chuẩn:
${questionData?.solution || ""}

Đáp án chuẩn:
${questionData?.answerKey || ""}

Bài làm của sinh viên:
${userAnswer || "(Bỏ trống)"}

Quy tắc:
- Nếu đáp số đúng hoặc phương pháp/lập luận đúng về bản chất thì score = 1.
- Chấp nhận khác biệt nhỏ về ký hiệu và cách trình bày.
- Chỉ score = 0 nếu bỏ trống hoặc sai bản chất.
- Trả về JSON thuần, không markdown:
{
  "score": 1,
  "isCorrect": true,
  "aiFeedback": "Nhận xét ngắn bằng tiếng Việt.",
  "skillsIdentified": ["khái niệm"]
}`;
}

async function gradeWithGemini(apiKey: string, questionData: any, userAnswer: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(questionData, userAnswer) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini HTTP ${response.status}`);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const parsed = JSON.parse(text.replace(/^\```json\s*/i, "").replace(/\s*\```$/i, "").trim());

  return {
    score: parsed.score === 1 || parsed.isCorrect === true ? 1 : 0,
    isCorrect: parsed.score === 1 || parsed.isCorrect === true,
    aiFeedback: parsed.aiFeedback || "AI đã chấm bài.",
    skillsIdentified: Array.isArray(parsed.skillsIdentified) ? parsed.skillsIdentified : (questionData?.topic ? [questionData.topic] : [])
  };
}

async function gradeWithOpenAI(apiKey: string, questionData: any, userAnswer: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Bạn là giảng viên Toán cao cấp chấm bài MAE101. Chỉ trả về JSON hợp lệ." },
        { role: "user", content: buildPrompt(questionData, userAnswer) }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI HTTP ${response.status}`);
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(text);

  return {
    score: parsed.score === 1 || parsed.isCorrect === true ? 1 : 0,
    isCorrect: parsed.score === 1 || parsed.isCorrect === true,
    aiFeedback: parsed.aiFeedback || "AI đã chấm bài.",
    skillsIdentified: Array.isArray(parsed.skillsIdentified) ? parsed.skillsIdentified : (questionData?.topic ? [questionData.topic] : [])
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { userAnswer = "", questionData, aiSettings } = req.body || {};

    if (!questionData) {
      return res.status(400).json({ error: "Missing questionData" });
    }

    const provider = aiSettings?.provider || "offline";
    const apiKey = aiSettings?.apiKey || "";

    if (provider === "gemini" && apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      try {
        return res.status(200).json(await gradeWithGemini(apiKey, questionData, userAnswer));
      } catch (error) {
        console.warn("Gemini grading failed; falling back to offline:", error);
      }
    }

    if (provider === "openai" && apiKey) {
      try {
        return res.status(200).json(await gradeWithOpenAI(apiKey, questionData, userAnswer));
      } catch (error) {
        console.warn("OpenAI grading failed; falling back to offline:", error);
      }
    }

    return res.status(200).json(gradeLocally(userAnswer, questionData));
  } catch (error: any) {
    console.error("Grade function error:", error);
    return res.status(200).json(gradeLocally(req.body?.userAnswer || "", req.body?.questionData || {}));
  }
}
