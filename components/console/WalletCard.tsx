"use client";

import {useState} from 'react';
import Link from 'next/link';
import type {WalletSummary} from '@attest/contracts';
import {formatNaira} from '@/lib/record';

/** The balance is bank-confirmed, separate from revenue and community obligations. */
export function WalletCard({wallet}:{wallet:WalletSummary}) {
  const [visible,setVisible]=useState(true);
  const account=wallet.receivingAccount??wallet.accountNumber;
  return <div className="wallet-overview">
    <article className="wallet-card" aria-label="Project wallet balance">
      <div className="row-between">
        <span className="wallet-brand">Attest <span>/ project wallet</span></span>
        <span className="wallet-environment">{wallet.environment==='sandbox'?'Banking sandbox':'Demo wallet'}</span>
      </div>
      <div className="wallet-balance">
        <div className="row"><p>Bank available balance</p><button type="button" className="wallet-visibility" aria-label={visible?'Hide wallet balance':'Show wallet balance'} aria-pressed={!visible} onClick={()=>setVisible(!visible)}>{visible?'Hide':'Show'}</button></div>
        <strong>{!visible?'••••••':wallet.bankAvailable===null?'Unavailable':formatNaira(wallet.bankAvailable)}</strong>
        <p className="wallet-caption">Confirmed by the bank. Community agreements are tracked separately below.</p>
      </div>
      <div className="wallet-card-foot"><div><span>Project receiving account</span><p>{account??'Link an account to get started'}</p></div><span className="wallet-access">access<span>Bank-connected payments</span></span></div>
    </article>
    <aside className="wallet-actions panel stack">
      <p className="eyebrow">Your money, clearly tracked</p>
      <h2 className="h3-display">From income to impact.</h2>
      <p className="note">Follow incoming funds, community payments and the history behind every distribution.</p>
      <Link href="#income" className="btn">View incoming funds <span aria-hidden="true">↙</span></Link>
      <Link href="/app/automation" className="btn-outline">Manage payment rules <span aria-hidden="true">→</span></Link>
      <Link href="/app/ledger" className="wallet-history-link">View funds history →</Link>
    </aside>
  </div>;
}
