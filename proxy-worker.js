/*
  悟空最佳实践库 · AI 代理（Cloudflare Worker）
  作用：前端把请求发到这个代理，代理在服务端补上 API Key 再转发给 Anthropic。
        这样 Key 不会出现在网页里，也解决浏览器直连的 CORS 问题。

  部署步骤（约 5 分钟，免费）：
  1) 打开 https://dash.cloudflare.com → 左侧 Workers & Pages → Create → Create Worker
  2) 给它起个名字（如 wukong-ai），点 Deploy 先建一个空的
  3) 点 "Edit code"，把本文件全部内容粘进去，替换原有示例，再 Deploy
  4) 回到 Worker 的 Settings → Variables and Secrets → 新增一个 Secret：
        名称：ANTHROPIC_API_KEY
        值：你的 Anthropic 密钥（sk-ant-...，在 https://console.anthropic.com 的 API Keys 创建，需开通额度）
     保存后再 Deploy 一次
  5) 复制这个 Worker 的访问地址（形如 https://wukong-ai.你的子域.workers.dev）
  6) 打开「悟空最佳实践库.html」→ 新增案例 → 高级 → 把地址填进“AI 接口地址”，保存即可。
     之后点“AI 一键生成”就会走这个代理，无需在网页里放 Key。

  可选安全加固：把下面 ALLOW_ORIGIN 改成你的站点域名（而不是 "*"），只允许自己的页面调用。
*/

const ALLOW_ORIGIN = "*"; // 例如改成 "https://yourname.github.io"

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": ALLOW_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return new Response("POST only", { status: 405, headers: cors });

    if (!env.ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "未配置 ANTHROPIC_API_KEY 环境变量" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const body = await request.text(); // 直接透传前端发来的 messages 请求体
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body,
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  },
};
