import { Loading } from "@/components/Loading";

/* The shape of what is coming, at the row height it will arrive at, rather
   than a spinner: a spinner states nothing. Spec patch 01, item 13. */
export default function LoadingScreen() {
  return (
    <div className="measure section-tight stack-lg">
      <Loading rows={6} label="Reading the record" />
    </div>
  );
}
