import { NextRequest, NextResponse } from "next/server";

type ManusMessage = {
  type: string;
  assistant_message?: { content: string };
  status_update?: { agent_status: string; waiting_for_event_id?: string };
};

export async function POST(req: NextRequest) {
  const { task_id } = await req.json();
  const apiKey = process.env.MANUS_API_KEY;
  if (!apiKey || !task_id) return NextResponse.json({ done: false, content: "" });

  const res = await fetch(
    `https://api.manus.ai/v2/task.listMessages?task_id=${task_id}&order=desc&limit=30`,
    { headers: { "x-manus-api-key": apiKey } }
  );
  if (!res.ok) return NextResponse.json({ done: false, content: "" });

  const data = (await res.json()) as { messages: ManusMessage[] };
  const messages = data.messages ?? [];

  // 時系列順に並べ直して全 assistant_message を結合
  const content = [...messages]
    .reverse()
    .filter((m) => m.type === "assistant_message" && m.assistant_message?.content)
    .map((m) => m.assistant_message!.content.trim())
    .join("\n\n");

  const statusMsg = messages.find((m) => m.type === "status_update");
  const agentStatus = statusMsg?.status_update?.agent_status ?? "";
  const done = agentStatus === "stopped" || agentStatus === "error";

  // waiting 状態なら自動承認
  if (agentStatus === "waiting" && statusMsg?.status_update?.waiting_for_event_id) {
    await fetch("https://api.manus.ai/v2/task.confirmAction", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-manus-api-key": apiKey },
      body: JSON.stringify({ task_id, event_id: statusMsg.status_update.waiting_for_event_id, input: { accept: true } }),
    }).catch(() => {});
  }

  return NextResponse.json({ done, content, status: agentStatus });
}
