import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function Agreement() {
  const router = useRouter()
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleAgree() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return; }

    await supabase.from('profiles').update({
      agreed_to_terms: true,
      agreed_at: new Date().toISOString()
    }).eq('id', user.id)

    const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single(); router.push(prof?.role === 'admin' ? '/admin/dashboard' : '/dashboard')
  }

  return (
    <div className="agreement-wrap">
      <div className="agreement-box">
        <div style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>Final step</div>
        <div style={{ fontSize: '22px', fontWeight: '700', letterSpacing: '-0.4px', marginBottom: '8px' }}>Influencer Agreement</div>
        <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.6', marginBottom: '4px' }}>
          Read and accept the terms below to activate your account.
        </p>

        <div className="agreement-scroll">
          <strong style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text)' }}>Non-Circumvention Clause</strong>
          By accessing this platform, you agree not to directly contact, solicit, or engage in business with any restaurant, venue, or business introduced to you through Michigan Food Media for a period of 24 months following your last collaboration. All collaboration opportunities must be coordinated exclusively through the agency. Violation of this clause may result in immediate account termination and legal action.
          <br /><br />
          <strong style={{ display: 'block', margin: '12px 0 8px', fontSize: '13px', color: 'var(--text)' }}>Payment Terms</strong>
          Payment will be issued within 5 business days following the completion and verification of all required deliverables. Late delivery of content may result in payment delays or cancellation of the collaboration fee. Michigan Food Media reserves the right to withhold payment if deliverables do not meet agreed specifications.
          <br /><br />
          <strong style={{ display: 'block', margin: '12px 0 8px', fontSize: '13px', color: 'var(--text)' }}>Content Requirements</strong>
          All sponsored content must be disclosed in accordance with FTC guidelines using appropriate hashtags (#ad, #sponsored, or #partner). Content must be posted within 48 hours of the agreed collaboration date and must remain live for a minimum of 30 days unless otherwise agreed in writing.
          <br /><br />
          <strong style={{ display: 'block', margin: '12px 0 8px', fontSize: '13px', color: 'var(--text)' }}>Exclusivity</strong>
          During any active collaboration period, creators agree not to promote directly competing restaurants in the same cuisine category within the same geographic market without prior written consent from Michigan Food Media.
          <br /><br />
          <strong style={{ display: 'block', margin: '12px 0 8px', fontSize: '13px', color: 'var(--text)' }}>Platform Usage</strong>
          This portal is for communication between creators and Michigan Food Media only. Direct communication with restaurants outside of this platform, including through social media or email, is strictly prohibited and constitutes a violation of this agreement.
        </div>

        <div className="check-row">
          <input type="checkbox" id="agree" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
          <label className="check-label" htmlFor="agree">
            I have read and fully agree to the terms above, including the non-circumvention clause and all platform usage rules.
          </label>
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', justifyContent: 'center', opacity: agreed ? 1 : 0.35, pointerEvents: agreed ? 'auto' : 'none' }}
          onClick={handleAgree}
          disabled={!agreed || loading}
        >
          {loading ? 'Activating...' : 'Activate My Account'}
        </button>
      </div>
    </div>
  )
}
