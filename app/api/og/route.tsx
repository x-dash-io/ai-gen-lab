import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/config";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const title = searchParams.get("title") || siteConfig.name;
    const description = searchParams.get("description") || siteConfig.description;

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0f1726",
            backgroundImage:
              "radial-gradient(circle at 10% 15%, rgba(12,131,120,0.36), transparent 35%), radial-gradient(circle at 90% 85%, rgba(197,127,34,0.28), transparent 42%)",
            padding: "54px",
            color: "#f0f7ff",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              height: "100%",
              borderRadius: "34px",
              border: "1px solid rgba(194,213,243,0.23)",
              background: "rgba(4, 14, 27, 0.56)",
              padding: "54px",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(145deg, #0c8378, #075b54)",
                  color: "#ffffff",
                  fontSize: "21px",
                  fontWeight: 700,
                }}
              >
                AG
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "32px", fontWeight: 700 }}>AI Genius Lab</span>
                <span style={{ fontSize: "16px", opacity: 0.82 }}>
                  Premium AI Learning Platform
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "18px",
                maxWidth: "940px",
              }}
            >
              <div
                style={{
                  fontSize: "62px",
                  lineHeight: 1.03,
                  letterSpacing: "-0.03em",
                  fontWeight: 700,
                }}
              >
                {title}
              </div>
              <div
                style={{
                  fontSize: "30px",
                  lineHeight: 1.3,
                  opacity: 0.86,
                }}
              >
                {description}
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
