import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, preferencesQuizTable } from "@workspace/db";
import { SubmitPreferencesQuizBody } from "@workspace/api-zod";

const router: IRouter = Router();

const QUIZ_QUESTIONS = [
  {
    id: "communication",
    question: "When receiving updates about your systems, how do you prefer information to be presented?",
    description: "This helps us tailor how Apphia communicates findings and recommendations.",
    options: [
      { value: "concise", label: "Just the essentials", description: "Brief summaries with key takeaways" },
      { value: "balanced", label: "A good overview", description: "Important details with context" },
      { value: "detailed", label: "The full picture", description: "Comprehensive breakdowns with technical depth" },
    ],
  },
  {
    id: "detail_level",
    question: "When investigating a system issue, how much detail do you want in the analysis?",
    description: "This shapes the depth of diagnostic reports.",
    options: [
      { value: "summary", label: "High-level summary", description: "Root cause and resolution at a glance" },
      { value: "standard", label: "Standard report", description: "Key findings with supporting evidence" },
      { value: "comprehensive", label: "Deep dive", description: "Full signal extraction, dependency mapping, and detailed reasoning" },
    ],
  },
  {
    id: "proactivity",
    question: "How would you like Apphia to approach potential issues it detects?",
    description: "This controls how proactively the system flags and addresses concerns.",
    options: [
      { value: "reactive", label: "Only when I ask", description: "Report findings only when requested" },
      { value: "balanced", label: "Flag important items", description: "Alert on significant findings, skip minor items" },
      { value: "proactive", label: "Stay ahead of everything", description: "Proactively monitor, alert, and suggest preventive actions" },
    ],
  },
  {
    id: "technical_depth",
    question: "How technical should the language be in reports and recommendations?",
    description: "This adjusts the vocabulary and complexity of system communications.",
    options: [
      { value: "simplified", label: "Keep it simple", description: "Plain language anyone can understand" },
      { value: "moderate", label: "Some technical terms", description: "Industry terms with explanations where needed" },
      { value: "technical", label: "Full technical detail", description: "Engineering-level precision with technical specifics" },
    ],
  },
];

router.get("/preferences/quiz", async (req: any, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  res.json({ questions: QUIZ_QUESTIONS });
});

router.post("/preferences/quiz", async (req: any, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const parsed = SubmitPreferencesQuizBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const answers = parsed.data.answers as Record<string, string>;

  const profile = {
    communicationStyle: answers.communication || "balanced",
    detailLevel: answers.detail_level || "standard",
    proactivity: answers.proactivity || "balanced",
    technicalDepth: answers.technical_depth || "moderate",
    completed: true,
  };

  await db.insert(preferencesQuizTable).values({
    userId: req.user.id,
    answers: parsed.data.answers,
    profile,
  });

  await db
    .update(usersTable)
    .set({
      preferencesQuizCompleted: "true",
      preferencesProfile: JSON.stringify(profile),
    })
    .where(eq(usersTable.id, req.user.id));

  res.json(profile);
});

router.get("/preferences/profile", async (req: any, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id));

  if (!user?.preferencesProfile) {
    res.json({
      communicationStyle: "balanced",
      detailLevel: "standard",
      proactivity: "balanced",
      technicalDepth: "moderate",
      completed: false,
    });
    return;
  }

  try {
    const profile = JSON.parse(user.preferencesProfile);
    res.json(profile);
  } catch {
    res.json({
      communicationStyle: "balanced",
      detailLevel: "standard",
      proactivity: "balanced",
      technicalDepth: "moderate",
      completed: false,
    });
  }
});

export default router;
