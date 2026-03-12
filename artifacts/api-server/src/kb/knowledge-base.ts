export interface KBEntry {
  id: string;
  domain: string;
  subdomain: string;
  issueType: string;
  symptoms: string[];
  resolutionSteps: string[];
  tier: "Tier1" | "Tier2" | "Tier3" | "Tier4";
  tags: string[];
  historicalSuccess: number;
  estimatedTime: string;
  prerequisites?: string[];
}

export interface UDI {
  udiId: string;
  domain: string | null;
  subdomain: string | null;
  symptom: string;
  confidenceScore: number;
  action: "Suggest" | "Escalate" | "AutoResolve";
  decisionReason: string;
  dependencies: string[];
  timestamp: string;
  escalationLevel: string;
  feedbackImpact: number;
  kbId: string | null;
  resolutionSteps: string[] | null;
  slaLimit: number;
}

export const KB: KBEntry[] = [
  {
    id: "TS-0001", domain: "Networking", subdomain: "VPN", issueType: "Connectivity",
    symptoms: ["Cannot connect VPN", "VPN timeout", "Authentication failed", "VPN client error"],
    resolutionSteps: ["Verify VPN client version compatibility", "Check firewall rules for VPN ports (UDP 500, 4500)", "Validate user credentials in Active Directory", "Restart VPN service on endpoint", "Check certificate validity"],
    tier: "Tier1", tags: ["VPN", "Windows", "Network"], historicalSuccess: 0.85, estimatedTime: "15-30min",
  },
  {
    id: "TS-0002", domain: "OS", subdomain: "Windows", issueType: "Software",
    symptoms: ["App crashes on launch", "Blue screen", "BSOD", "application not responding", "crash dump"],
    resolutionSteps: ["Review Windows Event Viewer for critical errors", "Update OS to latest patch level", "Update or rollback problematic drivers", "Run System File Checker (sfc /scannow)", "Check memory with Windows Memory Diagnostic"],
    tier: "Tier1", tags: ["Windows", "BSOD", "Crash"], historicalSuccess: 0.78, estimatedTime: "30-60min",
  },
  {
    id: "TS-0003", domain: "Database", subdomain: "PostgreSQL", issueType: "Performance",
    symptoms: ["slow queries", "database timeout", "connection pool exhausted", "high CPU database", "query taking too long"],
    resolutionSteps: ["Run EXPLAIN ANALYZE on slow queries", "Check pg_stat_activity for blocking queries", "Review index coverage with pg_stat_user_tables", "Increase connection pool size in config", "Run VACUUM ANALYZE on affected tables", "Check for long-running transactions with pg_locks"],
    tier: "Tier2", tags: ["PostgreSQL", "Database", "Performance"], historicalSuccess: 0.82, estimatedTime: "1-2hr",
  },
  {
    id: "TS-0004", domain: "Cloud", subdomain: "AWS", issueType: "Infrastructure",
    symptoms: ["EC2 instance unreachable", "AWS service unavailable", "S3 access denied", "Lambda timeout", "RDS connection refused"],
    resolutionSteps: ["Check AWS Service Health Dashboard for active incidents", "Verify Security Group and NACL rules", "Review IAM permissions and policies", "Check instance state and system status checks", "Validate VPC routing tables and NAT gateway"],
    tier: "Tier2", tags: ["AWS", "Cloud", "EC2"], historicalSuccess: 0.79, estimatedTime: "30-90min",
  },
  {
    id: "TS-0005", domain: "Security", subdomain: "Authentication", issueType: "Access",
    symptoms: ["login failed", "access denied", "permission error", "unauthorized", "MFA not working", "SSO failure"],
    resolutionSteps: ["Verify user account is active and not locked", "Check group membership and role assignments", "Validate MFA device enrollment", "Review OAuth token expiry and refresh logic", "Audit SAML/SSO configuration in identity provider", "Check certificate expiry for auth services"],
    tier: "Tier1", tags: ["Auth", "SSO", "MFA", "Security"], historicalSuccess: 0.91, estimatedTime: "15-45min",
  },
  {
    id: "TS-0006", domain: "Networking", subdomain: "DNS", issueType: "Resolution",
    symptoms: ["DNS resolution failure", "cannot resolve hostname", "domain not found", "nslookup fails", "intermittent DNS"],
    resolutionSteps: ["Run nslookup/dig against primary and secondary DNS servers", "Check DNS server configuration for correct zone records", "Flush DNS cache on affected endpoints", "Verify DNS forwarder configuration", "Check TTL values for recently modified records", "Test with alternative DNS (8.8.8.8)"],
    tier: "Tier1", tags: ["DNS", "Network", "Connectivity"], historicalSuccess: 0.88, estimatedTime: "15-30min",
  },
  {
    id: "TS-0007", domain: "DevOps", subdomain: "Docker", issueType: "Container",
    symptoms: ["container not starting", "docker error", "image pull failed", "container exited", "port conflict", "OOMKilled"],
    resolutionSteps: ["Inspect container logs: docker logs <container>", "Check resource limits (CPU/memory) with docker stats", "Verify image digest and pull policy", "Inspect network configuration: docker network inspect", "Review docker-compose.yml for configuration errors", "Check disk space: df -h, docker system df"],
    tier: "Tier2", tags: ["Docker", "Container", "DevOps"], historicalSuccess: 0.83, estimatedTime: "30-60min",
  },
  {
    id: "TS-0008", domain: "Application", subdomain: "API", issueType: "Integration",
    symptoms: ["API timeout", "503 error", "rate limited", "API key invalid", "webhook not firing", "REST API error"],
    resolutionSteps: ["Check API endpoint availability with curl/postman", "Verify API key validity and permissions", "Review rate limit headers in API responses", "Check webhook signatures and endpoint SSL certificates", "Inspect API gateway logs for upstream errors", "Validate request payload format against API spec"],
    tier: "Tier1", tags: ["API", "REST", "Webhook"], historicalSuccess: 0.86, estimatedTime: "15-45min",
  },
  {
    id: "TS-0009", domain: "OS", subdomain: "Linux", issueType: "Performance",
    symptoms: ["high CPU usage", "system slow", "load average high", "memory exhausted", "swap thrashing", "process hung"],
    resolutionSteps: ["Run top/htop to identify resource-intensive processes", "Check system logs: journalctl -xe, /var/log/syslog", "Review disk I/O with iostat and iotop", "Identify memory leaks with valgrind or smaps", "Check for zombie processes: ps aux | grep Z", "Review cron jobs and background services"],
    tier: "Tier2", tags: ["Linux", "Performance", "CPU", "Memory"], historicalSuccess: 0.80, estimatedTime: "30-90min",
  },
  {
    id: "TS-0010", domain: "Networking", subdomain: "Firewall", issueType: "Connectivity",
    symptoms: ["connection refused", "port blocked", "firewall dropping packets", "cannot reach service", "packet loss"],
    resolutionSteps: ["Test connectivity with telnet/nc on specific ports", "Review firewall rules: iptables -L or ufw status", "Check application listening on expected port: ss -tlnp", "Verify routing tables: ip route show", "Capture packets with tcpdump for analysis", "Review security group rules in cloud environment"],
    tier: "Tier1", tags: ["Firewall", "Network", "Ports"], historicalSuccess: 0.87, estimatedTime: "20-45min",
  },
  {
    id: "TS-0011", domain: "DevOps", subdomain: "Kubernetes", issueType: "Orchestration",
    symptoms: ["pod not starting", "CrashLoopBackOff", "ImagePullBackOff", "OOMKilled", "node not ready", "deployment stuck"],
    resolutionSteps: ["Describe failing pod: kubectl describe pod <name>", "Check pod logs: kubectl logs <pod> --previous", "Inspect node status: kubectl get nodes", "Review resource quotas and limits", "Check persistent volume claims", "Verify config maps and secrets are mounted correctly"],
    tier: "Tier2", tags: ["Kubernetes", "K8s", "DevOps", "Container"], historicalSuccess: 0.81, estimatedTime: "30-90min",
  },
  {
    id: "TS-0012", domain: "Application", subdomain: "Node.js", issueType: "Runtime",
    symptoms: ["node process crash", "uncaught exception", "memory leak node", "EMFILE error", "event loop lag"],
    resolutionSteps: ["Enable verbose error logging with NODE_OPTIONS", "Use --inspect for remote debugging", "Profile with node --prof or clinic.js", "Check file descriptor limits: ulimit -n", "Review async error handling patterns", "Monitor heap with process.memoryUsage()"],
    tier: "Tier2", tags: ["Node.js", "JavaScript", "Runtime"], historicalSuccess: 0.77, estimatedTime: "1-3hr",
  },
];

function simpleTokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
}

function cosineSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / Math.sqrt(setA.size * setB.size);
}

function calculateConfidence(query: string, entry: KBEntry): number {
  const queryTokens = simpleTokenize(query);
  const symptomText = entry.symptoms.join(" ") + " " + entry.tags.join(" ") + " " + entry.domain + " " + entry.subdomain;
  const kbTokens = simpleTokenize(symptomText);

  const similarity = cosineSimilarity(queryTokens, kbTokens);
  const recencyWeight = 0.1;

  return Math.min(1.0, 0.6 * similarity + 0.3 * entry.historicalSuccess + 0.1 * recencyWeight);
}

export function lookupKB(query: string, domain?: string, threshold = 0.15): UDI {
  const matches: Array<{ entry: KBEntry; score: number }> = [];

  for (const entry of KB) {
    if (domain && entry.domain.toLowerCase() !== domain.toLowerCase()) continue;
    const score = calculateConfidence(query, entry);
    if (score >= threshold) {
      matches.push({ entry, score });
    }
  }

  matches.sort((a, b) => b.score - a.score);

  const udiId = `UDI-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${Math.floor(Math.random() * 900) + 100}`;

  if (matches.length === 0) {
    return {
      udiId,
      domain: domain || null,
      subdomain: null,
      symptom: query,
      confidenceScore: 0,
      action: "Escalate",
      decisionReason: "No confident KB match found. Escalating to Tier 1 review.",
      dependencies: [],
      timestamp: new Date().toISOString(),
      escalationLevel: "Tier1",
      feedbackImpact: 0,
      kbId: null,
      resolutionSteps: null,
      slaLimit: 60,
    };
  }

  const best = matches[0];
  const confidenceScore = Math.round(best.score * 100);
  const action = confidenceScore >= 75 ? "Suggest" : confidenceScore >= 50 ? "Escalate" : "Escalate";
  const escalation = confidenceScore >= 75 ? best.entry.tier : "Tier1";

  return {
    udiId,
    domain: best.entry.domain,
    subdomain: best.entry.subdomain,
    symptom: query,
    confidenceScore,
    action,
    decisionReason: `Confidence ${confidenceScore}% ${confidenceScore >= 75 ? `> 75% threshold — matched KB article ${best.entry.id}` : "< 75% — escalating for human review"}`,
    dependencies: best.entry.prerequisites || [],
    timestamp: new Date().toISOString(),
    escalationLevel: escalation,
    feedbackImpact: 0,
    kbId: best.entry.id,
    resolutionSteps: best.entry.resolutionSteps,
    slaLimit: confidenceScore >= 75 ? 30 : 60,
  };
}

export function buildSystemPrompt(udi: UDI, additionalContext?: string): string {
  return `You are Apphia, the knowledge engine for Tech-Ops by Martin PMO.

UDI CONTEXT:
- UDI ID: ${udi.udiId}
- Domain: ${udi.domain || "Unknown"} / ${udi.subdomain || "Unknown"}
- Confidence: ${udi.confidenceScore}%
- Action: ${udi.action}
- Escalation Level: ${udi.escalationLevel}
${udi.kbId ? `- Matched KB Entry: ${udi.kbId}` : "- No KB match found"}
${udi.resolutionSteps ? `\nKNOWN RESOLUTION STEPS:\n${udi.resolutionSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}` : ""}
${additionalContext ? `\nADDITIONAL CONTEXT:\n${additionalContext}` : ""}

INSTRUCTIONS:
- Ask 2-3 clarifying questions if you need more information before proposing a solution
- Format responses with bullet points, numbered steps, and clear section headers
- Use plain language, not jargon (say "the server" not "the host node")
- Show your reasoning as "Thinking: ..." before each major conclusion
- Present action items as numbered steps, one at a time
- Never say "AI" or "assistant" — you are "Apphia" or "the Apphia Engine"
- If confidence is < 50%, be explicit that escalation is recommended`;
}
