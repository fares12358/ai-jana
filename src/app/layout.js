import "./globals.css";
import Providers from "@/components/Providers";

export const metadata = {
  title: "Lecture Brain – AI-Powered Learning",
  description:
    "Transform your lecture notes and videos into interactive learning experiences. Get explanations, summaries, and quiz questions powered by AI.",
};

// themeColor must be in viewport export (not metadata) in Next.js 13+
export const viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="">
      <head>
        {/*
          Anti-flash inline script: reads localStorage BEFORE paint so the
          correct dark/light class is already on <html> when CSS loads.
          Must stay synchronous — no defer / async.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try{
                  var t=localStorage.getItem('lb_theme');
                  var prefersDark=window.matchMedia('(prefers-color-scheme:dark)').matches;
                  if(t==='dark'||(t===null&&prefersDark)){
                    document.documentElement.classList.add('dark');
                  }
                }catch(e){}
              })();
            `,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
