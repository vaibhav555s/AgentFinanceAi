import re

with open('src/pages/OpsDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Transcripts map
content = content.replace("TRANSCRIPT.map((entry, i) => (", "events.map((entry, i) => (")
content = content.replace("entry.role === 'ai' ? -8 : 8", "entry.event === 'ai_response' ? -8 : 8")
content = content.replace("entry.role === 'ai' ? '#3B82F6' : '#64748B'", "entry.event === 'ai_response' ? '#3B82F6' : '#64748B'")
content = content.replace("{entry.name}", "{entry.event === 'ai_response' ? 'AI Agent' : 'System/User'}")
content = content.replace("{entry.time}", "{new Date(entry.created_at).toLocaleTimeString()}")
content = content.replace("{entry.msg}", "{entry.metadata?.text || entry.event}")

# SESSIONS mapping in LiveSessionsSection
content = content.replace("SESSIONS.map((s, i) => {", "sessions.map((s, i) => {")
content = content.replace("{s.name}", "{s.profiles?.name || 'Unknown'}")
content = content.replace("{s.amount}", "{s.metadata?.amount || 'N/A'}")
content = content.replace("s.score >= 700", "(s.fraud_risk_score||0) < 30")
content = content.replace("s.score >= 650", "(s.fraud_risk_score||0) < 60")
content = content.replace("{s.score}", "{s.fraud_risk_score || 'N/A'}")
content = content.replace("{s.time}", "{new Date(s.created_at).toLocaleDateString()}")
content = content.replace(" riskCfg[s.risk]", " riskCfg[s.fraud_risk_score > 60 ? 'high' : s.fraud_risk_score > 30 ? 'medium' : 'low'] || riskCfg.low")
content = content.replace("statusCfg[s.status]", "statusCfg[s.status] || statusCfg.live")
content = content.replace("{s.stage}/5", "{s.application_stage}")
content = content.replace("(s.stage / 5) * 100", "(['kyc','bureau','offer','completed'].indexOf(s.application_stage) + 1)/4 * 100")

# Fraud signals mapping
content = content.replace("FRAUD_SIGNALS.map((f, i) => {", "flags.map((f, i) => {")
content = content.replace("{f.type}", "{f.flag_type}")
content = content.replace("{f.session}", "{f.application_id}")
content = content.replace("{f.desc}", "{f.description}")
content = content.replace("{f.time}", "{new Date(f.created_at).toLocaleTimeString()}")
content = content.replace("sevCfg[f.severity]", "sevCfg[f.severity] || sevCfg.clear")

# Transcripts map (bottom section)
content = content.replace("const sessions = [", "/*")
content = content.replace("];\n\n  return", "*/\n  return")

# Replace metrics in Overview section
content = content.replace('value="1"', 'value={sessions.filter(s => s.status === "live").length}')
content = content.replace('trend="1 live now"', 'trend={`${sessions.filter(s => s.status === "live").length} live now`}')

content = content.replace('value="0"', 'value={flags.filter(f => f.severity === "high").length}')
content = content.replace('trend="All clear"', 'trend={flags.filter(f => f.severity === "high").length === 0 ? "All clear" : "Action needed"}')

with open('src/pages/OpsDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
