function htmlResponse(body, status = 200) {
  return new Response(`<!doctype html><html><body>${body}</body></html>`, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function callbackScript(message) {
  const payload = JSON.stringify(message);
  return `
    <script>
      (function() {
        function receiveMessage(event) {
          window.opener.postMessage(${payload}, event.origin);
          window.removeEventListener("message", receiveMessage, false);
        }
        window.addEventListener("message", receiveMessage, false);
        window.opener.postMessage("authorizing:github", "*");
      })();
    </script>
  `;
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const clientId = env.GITHUB_CLIENT_ID;
  const clientSecret = env.GITHUB_CLIENT_SECRET;

  if (!code) {
    return htmlResponse(callbackScript("authorization:github:error:Missing GitHub authorization code."), 400);
  }

  if (!clientId || !clientSecret) {
    return htmlResponse(callbackScript("authorization:github:error:Missing GitHub OAuth environment variables."), 500);
  }

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "user-agent": "wanderers-kneaded-decap-cms"
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${url.origin}/api/auth/callback`
    })
  });

  const result = await tokenResponse.json();

  if (!tokenResponse.ok || !result.access_token) {
    return htmlResponse(callbackScript(`authorization:github:error:${result.error_description || "GitHub token exchange failed."}`), 500);
  }

  const content = {
    token: result.access_token,
    provider: "github"
  };

  return htmlResponse(callbackScript(`authorization:github:success:${JSON.stringify(content)}`));
}
