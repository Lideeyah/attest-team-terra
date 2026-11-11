"use client";
import {useLinkStatus} from 'next/link';
export function LinkFeedback(){const {pending}=useLinkStatus();return <span className="link-feedback" role="status">{pending?<><span className="busy-spinner" aria-hidden="true"/><span className="sr-only">Opening page...</span></>:null}</span>;}
