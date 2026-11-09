/* The public group carries no chrome of its own. The landing page is one
   sentence on paper, and the register, verify and report surfaces bring the
   masthead with them. */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return children;
}
