import {redirect} from "next/navigation";
// Old verification links remain usable as a route to MVP sign-in.
export default async function VerifyEmailPage({searchParams}:{searchParams:Promise<{email?:string}>}) {
  const {email}=await searchParams;
  redirect('/signin'+(email?'?email='+encodeURIComponent(email):''));
}
