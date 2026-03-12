export type IssueSeverity = "P1" | "P2" | "P3" | "P4";
export type IssueIntent = "diagnostic" | "informational" | "escalation" | "monitoring";

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
  selfHealable?: boolean;
  escalationConditions?: string[];
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
  severity: IssueSeverity;
  intent: IssueIntent;
  synonymsMatched: string[];
  selfHealable: boolean;
}

const SYNONYM_MAP: Record<string, string[]> = {
  "cannot connect": ["VPN", "network", "connectivity", "firewall"],
  "can't connect": ["VPN", "network", "connectivity", "firewall"],
  "not connecting": ["VPN", "network", "connectivity"],
  "connection refused": ["firewall", "port", "network"],
  "timeout": ["network", "database", "API", "connectivity"],
  "crashed": ["crash", "BSOD", "restart", "process"],
  "not starting": ["startup", "service", "boot", "crash"],
  "slow": ["performance", "latency", "response time", "degraded"],
  "hanging": ["performance", "memory", "process hung"],
  "error 503": ["service unavailable", "down", "API"],
  "error 500": ["internal server error", "application"],
  "access denied": ["permission", "authentication", "authorization"],
  "login failed": ["authentication", "credentials", "MFA"],
  "unauthorized": ["authentication", "token", "permission"],
  "out of memory": ["memory", "OOM", "memory leak"],
  "disk full": ["disk", "storage", "space"],
  "high cpu": ["CPU", "performance", "load average"],
  "page not found": ["404", "DNS", "routing"],
  "certificate expired": ["SSL", "TLS", "certificate", "HTTPS"],
  "deployment failed": ["CI/CD", "pipeline", "Docker", "Kubernetes"],
};

const SEVERITY_TRIGGERS: Record<IssueSeverity, string[]> = {
  P1: ["down", "all users", "production outage", "critical failure", "entire", "complete outage", "no one can", "system wide", "data loss"],
  P2: ["major", "significant", "many users", "most users", "degraded", "partial outage", "affecting team", "multiple services"],
  P3: ["slow", "intermittent", "some users", "single user", "non-critical", "workaround available", "occasional"],
  P4: ["question", "how to", "best practice", "documentation", "informational", "guidance", "advice"],
};

const INTENT_PATTERNS: Record<IssueIntent, string[]> = {
  diagnostic: ["fix", "broken", "error", "failed", "not working", "issue", "problem", "crash", "down", "cannot", "won't"],
  informational: ["how to", "what is", "explain", "documentation", "guide", "best practice", "learn"],
  escalation: ["urgent", "P1", "critical", "emergency", "escalate", "outage", "down", "all users affected"],
  monitoring: ["check", "status", "health", "monitor", "uptime", "availability", "alert"],
};

export const KB: KBEntry[] = [
  {
    id: "TS-0001", domain: "Networking", subdomain: "VPN", issueType: "Connectivity",
    symptoms: ["Cannot connect VPN", "VPN timeout", "Authentication failed VPN", "VPN client error", "cannot connect vpn", "vpn not working"],
    resolutionSteps: [
      "Verify VPN client version is current (minimum: required enterprise version)",
      "Check firewall rules: UDP 500 and 4500 must be open for IKEv2",
      "Validate user credentials in Active Directory — check for account lockout",
      "Restart the VPN service on endpoint: 'net stop vpnservice && net start vpnservice'",
      "Check certificate validity: openssl s_client -connect vpn-server:443",
      "If all else fails, re-provision VPN profile from IT portal"
    ],
    tier: "Tier1", tags: ["VPN", "Windows", "Network", "connectivity"], historicalSuccess: 0.85, estimatedTime: "15-30min",
    selfHealable: false,
    escalationConditions: ["Certificate issues", "AD account locked", "Multiple users affected simultaneously"],
  },
  {
    id: "TS-0002", domain: "OS", subdomain: "Windows", issueType: "Software",
    symptoms: ["App crashes on launch", "Blue screen", "BSOD", "application not responding", "crash dump", "windows crash", "system freeze"],
    resolutionSteps: [
      "Review Windows Event Viewer → Windows Logs → Application for critical errors in the last hour",
      "Run System File Checker: sfc /scannow (elevated PowerShell)",
      "Check for pending updates: Windows Update → Check for updates",
      "Run Memory Diagnostic: mdsched.exe — schedule for next restart",
      "Update or rollback drivers via Device Manager, focus on Display and Storage controllers",
      "If crash loop: boot to Safe Mode, run sfc /scannow, then normal restart"
    ],
    tier: "Tier1", tags: ["Windows", "BSOD", "Crash", "OS"], historicalSuccess: 0.78, estimatedTime: "30-60min",
    selfHealable: false,
    escalationConditions: ["Hardware failure suspected", "Recurring BSOD after driver updates", "Multiple machines affected"],
  },
  {
    id: "TS-0003", domain: "Database", subdomain: "PostgreSQL", issueType: "Performance",
    symptoms: ["slow queries", "database timeout", "connection pool exhausted", "high CPU database", "query taking too long", "pg_stat", "postgres slow"],
    resolutionSteps: [
      "Identify slow queries: SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10",
      "Check blocking queries: SELECT * FROM pg_stat_activity WHERE wait_event IS NOT NULL",
      "Run EXPLAIN ANALYZE on the top slow query to identify missing indexes",
      "Check connection count: SELECT count(*) FROM pg_stat_activity — if near max_connections, increase pool size",
      "Run VACUUM ANALYZE on frequently updated tables",
      "Review pg_locks for deadlocks: SELECT * FROM pg_locks WHERE NOT granted"
    ],
    tier: "Tier2", tags: ["PostgreSQL", "Database", "Performance", "SQL"], historicalSuccess: 0.82, estimatedTime: "1-2hr",
    selfHealable: false,
    escalationConditions: ["Table corruption detected", "Replication lag > 5 minutes", "Disk full preventing WAL writes"],
  },
  {
    id: "TS-0004", domain: "Cloud", subdomain: "AWS", issueType: "Infrastructure",
    symptoms: ["EC2 instance unreachable", "AWS service unavailable", "S3 access denied", "Lambda timeout", "RDS connection refused", "AWS down"],
    resolutionSteps: [
      "Check AWS Service Health Dashboard: status.aws.amazon.com for active incidents in your region",
      "Verify Security Group inbound rules allow traffic from your source IP on required port",
      "Check NACL rules — both inbound and outbound must permit the traffic flow",
      "Review IAM permissions: use IAM Policy Simulator to test specific actions",
      "Check instance system status: EC2 → Instances → Status Checks tab",
      "Review VPC routing tables and confirm NAT Gateway or IGW is properly configured"
    ],
    tier: "Tier2", tags: ["AWS", "Cloud", "EC2", "S3", "Lambda"], historicalSuccess: 0.79, estimatedTime: "30-90min",
    selfHealable: true,
    escalationConditions: ["AWS-wide outage confirmed", "Production data inaccessible", "RDS automated backup corruption"],
  },
  {
    id: "TS-0005", domain: "Security", subdomain: "Authentication", issueType: "Access",
    symptoms: ["login failed", "access denied", "permission error", "unauthorized", "MFA not working", "SSO failure", "cannot login", "authentication error"],
    resolutionSteps: [
      "Verify user account status in your IdP (Okta, Azure AD, Google) — check for lockout or suspension",
      "Check group membership: user must be in the correct security group for the application",
      "Validate MFA device enrollment — user may need to re-enroll device",
      "Review OAuth token: check token expiry time and refresh token validity",
      "Audit SAML/SSO configuration: verify ACS URL, Entity ID, and certificate match between SP and IdP",
      "Check for IP-based access restrictions — user's IP may be blocked by policy"
    ],
    tier: "Tier1", tags: ["Auth", "SSO", "MFA", "Security", "login", "authentication"], historicalSuccess: 0.91, estimatedTime: "15-45min",
    selfHealable: false,
    escalationConditions: ["Potential security breach", "Credential stuffing detected", "Admin account compromised"],
  },
  {
    id: "TS-0006", domain: "Networking", subdomain: "DNS", issueType: "Resolution",
    symptoms: ["DNS resolution failure", "cannot resolve hostname", "domain not found", "nslookup fails", "intermittent DNS", "dns not working"],
    resolutionSteps: [
      "Test DNS resolution: nslookup hostname 8.8.8.8 (using Google DNS as control)",
      "Flush DNS cache: ipconfig /flushdns (Windows) or sudo dscacheutil -flushcache (macOS)",
      "Check DNS server config: confirm primary and secondary DNS IPs are correct on the interface",
      "Verify DNS zone records: A record, CNAME, MX — check for recently deleted or modified records",
      "Check TTL: if you recently changed a record, wait for TTL expiry (check with dig +noall +answer hostname)",
      "Test internal vs. external resolution to isolate split-horizon DNS issues"
    ],
    tier: "Tier1", tags: ["DNS", "Network", "Connectivity", "hostname"], historicalSuccess: 0.88, estimatedTime: "15-30min",
    selfHealable: true,
    escalationConditions: ["DNS zone corruption", "DNSSEC validation failures", "Authoritative server unreachable"],
  },
  {
    id: "TS-0007", domain: "DevOps", subdomain: "Docker", issueType: "Container",
    symptoms: ["container not starting", "docker error", "image pull failed", "container exited", "port conflict", "OOMKilled", "docker crash"],
    resolutionSteps: [
      "Inspect container exit code: docker inspect <container> | grep ExitCode (137=OOM, 1=app error, 126=permission)",
      "Check container logs: docker logs <container> --tail 100",
      "Check resource usage: docker stats — look for memory limit being hit",
      "Verify image availability: docker pull <image> — check registry credentials",
      "Check port conflicts: ss -tlnp | grep <port>",
      "Review Docker daemon logs: journalctl -u docker --since '1 hour ago'"
    ],
    tier: "Tier2", tags: ["Docker", "Container", "DevOps", "image"], historicalSuccess: 0.83, estimatedTime: "30-60min",
    selfHealable: true,
    escalationConditions: ["Data volume corruption", "Docker daemon crash requiring host restart", "Registry outage blocking deployments"],
  },
  {
    id: "TS-0008", domain: "Application", subdomain: "API", issueType: "Integration",
    symptoms: ["API timeout", "503 error", "rate limited", "API key invalid", "webhook not firing", "REST API error", "api not responding"],
    resolutionSteps: [
      "Test endpoint directly: curl -I https://api.example.com/health — check response code and headers",
      "Verify API key: check expiry date and scope permissions in the API provider dashboard",
      "Review rate limit headers: X-RateLimit-Remaining and X-RateLimit-Reset in response",
      "Inspect webhook payload and signature: compare HMAC SHA-256 of body against X-Hub-Signature header",
      "Check API gateway logs for upstream errors — distinguish 4xx (client) vs 5xx (server) errors",
      "Verify request payload matches the API spec exactly — use a schema validator if available"
    ],
    tier: "Tier1", tags: ["API", "REST", "Webhook", "integration"], historicalSuccess: 0.86, estimatedTime: "15-45min",
    selfHealable: false,
    escalationConditions: ["API provider outage confirmed", "Webhook secret rotation required", "Data corruption from failed API calls"],
  },
  {
    id: "TS-0009", domain: "OS", subdomain: "Linux", issueType: "Performance",
    symptoms: ["high CPU usage", "system slow", "load average high", "memory exhausted", "swap thrashing", "process hung", "linux performance"],
    resolutionSteps: [
      "Check load average and top processes: top -bn1 | head -20",
      "Identify CPU hog by process: ps aux --sort=-%cpu | head -10",
      "Check memory usage: free -h — look for swap usage indicating memory pressure",
      "Review disk I/O: iostat -xz 1 3 — look for await > 100ms indicating disk bottleneck",
      "Find zombie processes: ps aux | awk '$8 == \"Z\"'",
      "Check for runaway cron jobs: crontab -l && cat /etc/cron.d/*"
    ],
    tier: "Tier2", tags: ["Linux", "Performance", "CPU", "Memory", "OS"], historicalSuccess: 0.80, estimatedTime: "30-90min",
    selfHealable: true,
    escalationConditions: ["Hardware degradation suspected", "Kernel panic", "Memory hardware failure (ECC errors)"],
  },
  {
    id: "TS-0010", domain: "Networking", subdomain: "Firewall", issueType: "Connectivity",
    symptoms: ["connection refused", "port blocked", "firewall dropping packets", "cannot reach service", "packet loss", "firewall block"],
    resolutionSteps: [
      "Test port reachability: nc -zv hostname port (or Test-NetConnection hostname -Port port on Windows)",
      "Check firewall rules: iptables -L -n -v (Linux) or ufw status verbose",
      "Verify application is listening: ss -tlnp | grep <port>",
      "Capture and analyze traffic: tcpdump -i eth0 port <port> -c 50",
      "Review cloud security group rules — both inbound and outbound",
      "Check host-based firewall on both source and destination"
    ],
    tier: "Tier1", tags: ["Firewall", "Network", "Ports", "connectivity"], historicalSuccess: 0.87, estimatedTime: "20-45min",
    selfHealable: false,
    escalationConditions: ["Firewall policy change required", "Multi-tenant security group conflict", "Zero-day vulnerability in firewall firmware"],
  },
  {
    id: "TS-0011", domain: "DevOps", subdomain: "Kubernetes", issueType: "Orchestration",
    symptoms: ["pod not starting", "CrashLoopBackOff", "ImagePullBackOff", "OOMKilled", "node not ready", "deployment stuck", "k8s error", "kubernetes"],
    resolutionSteps: [
      "Describe the failing pod: kubectl describe pod <name> -n <namespace> — look at Events section",
      "Check pod logs: kubectl logs <pod> -n <namespace> --previous (for crashed containers)",
      "Check node status: kubectl get nodes — look for NotReady, MemoryPressure, DiskPressure",
      "Review resource quotas: kubectl describe quota -n <namespace>",
      "Check PersistentVolumeClaims: kubectl get pvc -n <namespace>",
      "Verify ConfigMaps and Secrets are mounted: kubectl get configmap,secret -n <namespace>"
    ],
    tier: "Tier2", tags: ["Kubernetes", "K8s", "DevOps", "Container", "pod"], historicalSuccess: 0.81, estimatedTime: "30-90min",
    selfHealable: true,
    escalationConditions: ["etcd corruption", "Control plane unavailable", "Persistent data loss from PVC deletion"],
  },
  {
    id: "TS-0012", domain: "Application", subdomain: "Node.js", issueType: "Runtime",
    symptoms: ["node process crash", "uncaught exception", "memory leak node", "EMFILE error", "event loop lag", "nodejs crash"],
    resolutionSteps: [
      "Enable verbose error capturing: process.on('uncaughtException', err => logger.error(err))",
      "Profile with Node.js built-in: node --prof app.js, then: node --prof-process isolate-*.log",
      "Check heap usage: process.memoryUsage() — alert if heapUsed > 0.85 * heapTotal",
      "Check for file descriptor leak: lsof -p <pid> | wc -l — compare against ulimit -n",
      "Review async patterns: look for missing await, unhandled Promise rejections",
      "Use clinic.js for flamegraph profiling: npx clinic flame -- node app.js"
    ],
    tier: "Tier2", tags: ["Node.js", "JavaScript", "Runtime", "memory leak"], historicalSuccess: 0.77, estimatedTime: "1-3hr",
    selfHealable: false,
    escalationConditions: ["Memory leak causing production OOM", "Event loop completely blocked > 30s", "Cluster-wide Node.js version incompatibility"],
  },
  {
    id: "TS-0013", domain: "Security", subdomain: "Certificates", issueType: "TLS",
    symptoms: ["SSL error", "certificate expired", "certificate invalid", "HTTPS not working", "TLS handshake failed", "cert error", "ssl certificate"],
    resolutionSteps: [
      "Check certificate expiry: openssl s_client -connect hostname:443 2>/dev/null | openssl x509 -noout -dates",
      "Verify certificate chain is complete: openssl verify -CAfile chain.pem cert.pem",
      "Check hostname matches CN/SAN: openssl x509 -text -noout -in cert.pem | grep -A1 'Subject Alternative'",
      "Renew certificate via Let's Encrypt: certbot renew --force-renewal",
      "Update certificate in all locations: load balancer, nginx/apache config, app keystore",
      "Verify certificate propagation: ssl-checker.online or qualys SSL Labs"
    ],
    tier: "Tier1", tags: ["SSL", "TLS", "certificate", "HTTPS", "security"], historicalSuccess: 0.93, estimatedTime: "15-45min",
    selfHealable: true,
    escalationConditions: ["CA compromise detected", "Wildcard cert rotation required across 20+ services", "HSM failure preventing private key access"],
  },
  {
    id: "TS-0014", domain: "Application", subdomain: "Database", issueType: "Connectivity",
    symptoms: ["database connection error", "cannot connect to database", "db connection refused", "pool timeout", "ECONNREFUSED", "database not responding"],
    resolutionSteps: [
      "Test direct DB connectivity: psql -h hostname -U user -d dbname (or equivalent for MySQL/MongoDB)",
      "Check DB server process: systemctl status postgresql (or mysql, mongod)",
      "Review connection string: verify host, port, username, password, database name, SSL mode",
      "Check max_connections: SHOW max_connections; and active connections: SELECT count(*) FROM pg_stat_activity",
      "Review application connection pool settings: min/max pool size, acquire timeout, idle timeout",
      "Check DB server disk space: df -h — a full disk prevents PostgreSQL from writing WAL logs"
    ],
    tier: "Tier1", tags: ["Database", "connection", "PostgreSQL", "MySQL", "MongoDB"], historicalSuccess: 0.89, estimatedTime: "15-45min",
    selfHealable: false,
    escalationConditions: ["Primary DB failure requiring failover", "Connection exhaustion at DB level", "Database data corruption"],
  },
  {
    id: "TS-0015", domain: "Cloud", subdomain: "CI/CD", issueType: "Pipeline",
    symptoms: ["deployment failed", "pipeline failed", "CI failed", "build error", "GitHub Actions failing", "deployment stuck", "release failed"],
    resolutionSteps: [
      "Review pipeline logs for the first failure: look for the exact step and error message",
      "Check environment variables and secrets: verify all required secrets are set in CI/CD settings",
      "Verify Dockerfile or build configuration hasn't changed unexpectedly",
      "Check artifact registry: ensure base images are available and not rate-limited",
      "Review resource limits: CI runner may be OOM — increase runner memory or optimize build",
      "Re-run the pipeline with verbose/debug logging enabled to capture full context"
    ],
    tier: "Tier2", tags: ["CI/CD", "deployment", "pipeline", "GitHub Actions", "build"], historicalSuccess: 0.84, estimatedTime: "30-60min",
    selfHealable: false,
    escalationConditions: ["Production deployment corrupted — needs rollback", "Secret rotation required mid-pipeline", "Registry completely unavailable"],
  },
];

function simpleTokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(t => t.length > 2);
}

function expandWithSynonyms(tokens: string[]): string[] {
  const expanded = new Set(tokens);
  const text = tokens.join(" ");
  for (const [phrase, synonyms] of Object.entries(SYNONYM_MAP)) {
    if (text.includes(phrase.toLowerCase())) {
      synonyms.forEach(s => expanded.add(s.toLowerCase()));
    }
  }
  return [...expanded];
}

function cosineSimilarity(queryTokens: string[], kbTokens: string[]): number {
  const setA = new Set(queryTokens);
  const setB = new Set(kbTokens);
  const intersection = [...setA].filter(x => setB.has(x)).length;
  if (setA.size === 0 || setB.size === 0) return 0;
  return intersection / Math.sqrt(setA.size * setB.size);
}

export function classifySeverity(query: string): IssueSeverity {
  const lower = query.toLowerCase();
  for (const [severity, triggers] of Object.entries(SEVERITY_TRIGGERS) as [IssueSeverity, string[]][]) {
    if (triggers.some(t => lower.includes(t))) return severity;
  }
  return "P3";
}

export function classifyIntent(query: string): IssueIntent {
  const lower = query.toLowerCase();
  let bestIntent: IssueIntent = "diagnostic";
  let bestScore = 0;
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS) as [IssueIntent, string[]][]) {
    const score = patterns.filter(p => lower.includes(p)).length;
    if (score > bestScore) { bestScore = score; bestIntent = intent; }
  }
  return bestIntent;
}

export function lookupKB(query: string, domain?: string, threshold = 0.12): UDI {
  const queryTokens = simpleTokenize(query);
  const expandedTokens = expandWithSynonyms(queryTokens);
  const synonymsMatched = expandedTokens.filter(t => !queryTokens.includes(t));
  const severity = classifySeverity(query);
  const intent = classifyIntent(query);

  const matches: Array<{ entry: KBEntry; score: number }> = [];

  for (const entry of KB) {
    if (domain && entry.domain.toLowerCase() !== domain.toLowerCase()) continue;
    const symptomText = entry.symptoms.join(" ") + " " + entry.tags.join(" ") + " " + entry.domain + " " + entry.subdomain + " " + entry.issueType;
    const kbTokens = simpleTokenize(symptomText);
    const similarity = cosineSimilarity(expandedTokens, kbTokens);
    if (similarity >= threshold) {
      const domainBoost = domain ? 0.1 : 0;
      matches.push({ entry, score: Math.min(1.0, 0.55 * similarity + 0.35 * entry.historicalSuccess + 0.1 * domainBoost) });
    }
  }

  matches.sort((a, b) => b.score - a.score);

  const udiId = `UDI-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${Math.floor(Math.random() * 900) + 100}`;

  if (matches.length === 0) {
    return {
      udiId, domain: domain || null, subdomain: null, symptom: query,
      confidenceScore: 0, action: "Escalate",
      decisionReason: "No confident KB match found. Escalating to Tier 1 review.",
      dependencies: [], timestamp: new Date().toISOString(), escalationLevel: "Tier1",
      feedbackImpact: 0, kbId: null, resolutionSteps: null, slaLimit: 60,
      severity, intent, synonymsMatched, selfHealable: false,
    };
  }

  const best = matches[0];
  const confidenceScore = Math.round(best.score * 100);
  const action: UDI["action"] = best.entry.selfHealable && confidenceScore >= 80 ? "AutoResolve"
    : confidenceScore >= 70 ? "Suggest"
    : "Escalate";
  const escalation = confidenceScore >= 75 ? best.entry.tier : "Tier1";
  const slaLimit = severity === "P1" ? 15 : severity === "P2" ? 30 : severity === "P3" ? 60 : 240;

  return {
    udiId, domain: best.entry.domain, subdomain: best.entry.subdomain,
    symptom: query, confidenceScore, action,
    decisionReason: `Confidence ${confidenceScore}% ${confidenceScore >= 70
      ? `— matched KB article ${best.entry.id} (${best.entry.domain}/${best.entry.subdomain})`
      : "< 70% threshold — escalating for human review"}`,
    dependencies: best.entry.prerequisites || [],
    timestamp: new Date().toISOString(),
    escalationLevel: escalation, feedbackImpact: 0,
    kbId: best.entry.id, resolutionSteps: best.entry.resolutionSteps,
    slaLimit, severity, intent, synonymsMatched, selfHealable: best.entry.selfHealable || false,
  };
}

export function buildSystemPrompt(udi: UDI, additionalContext?: string): string {
  return `You are Apphia, the knowledge engine for Tech-Ops by Martin PMO.

UDI CONTEXT:
- UDI ID: ${udi.udiId}
- Domain: ${udi.domain || "Unknown"} / ${udi.subdomain || "Unknown"}
- Severity: ${udi.severity} | SLA Limit: ${udi.slaLimit} minutes
- Confidence: ${udi.confidenceScore}%
- Intent: ${udi.intent}
- Action Recommended: ${udi.action}
- Escalation Level: ${udi.escalationLevel}
${udi.kbId ? `- Matched KB Entry: ${udi.kbId}` : "- No KB match found"}
${udi.synonymsMatched.length ? `- Semantic expansion applied: ${udi.synonymsMatched.slice(0, 5).join(", ")}` : ""}
${udi.resolutionSteps ? `
KNOWN RESOLUTION STEPS FROM KB:
${udi.resolutionSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}` : ""}
${additionalContext ? `\nADDITIONAL CONTEXT:\n${additionalContext}` : ""}

RESPONSE INSTRUCTIONS:
- If this is the FIRST message and you don't have enough context, ask 2-3 specific clarifying questions before proposing steps
- Format all responses with clear sections: ## Section headers, numbered steps, bullet points
- Show reasoning as "Thinking: ..." before each major conclusion
- For ${udi.severity} incidents: ${udi.severity === "P1" || udi.severity === "P2" ? "treat as URGENT — recommend immediate escalation alongside troubleshooting" : "provide thorough but methodical steps"}
- Present action items one tier at a time — don't dump all steps at once
- Never say "AI" or "assistant" — you are "Apphia" or "the Apphia Engine"
- End every response with a clear "Next Step" or "Awaiting your confirmation to proceed"`;
}

export function searchKB(query: string): Array<{ entry: KBEntry; score: number }> {
  const queryTokens = expandWithSynonyms(simpleTokenize(query));
  const results: Array<{ entry: KBEntry; score: number }> = [];
  for (const entry of KB) {
    const symptomText = entry.symptoms.join(" ") + " " + entry.tags.join(" ") + " " + entry.domain + " " + entry.subdomain;
    const kbTokens = simpleTokenize(symptomText);
    const score = cosineSimilarity(queryTokens, kbTokens);
    if (score > 0.05) results.push({ entry, score });
  }
  return results.sort((a, b) => b.score - a.score);
}
