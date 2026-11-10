import { Loading } from "@/components/Loading";

/* The account graph takes a moment to arrive, and the skeleton is the height
   the drawing will be, so the page does not jump when it does. */
export default function LoadingSignal() {
  return (
    <div className="measure section-tight stack-lg">
      <Loading rows={3} label="Reading the signal" />
      <div className="graph-surface graph-skeleton" aria-busy="true" />
    </div>
  );
}
