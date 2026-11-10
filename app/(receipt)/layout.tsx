import "./receipt.css";

/* The participant receipt. It is opened from an SMS link on a cheap Android
   phone over an intermittent connection, so it carries no web font, no motion
   provider, no toast stack and no client JavaScript of its own. Everything on
   it is a server-rendered page and an ordinary HTML form. */
export default function ReceiptLayout({ children }: LayoutProps<"/">) {
  return <main className="receipt">{children}</main>;
}
