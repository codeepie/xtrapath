// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/mermaid_handler.js

/**
 * Premium Default Mermaid.js Diagram Templates
 * Engineered for high-clarity responsive presentation across preview screens.
 */
window.mermaidTemplates = {
    architecture_flow: `flowchart LR
    %% Modern Cyberpunk Cloud Architecture & Event Stream
    subgraph Clients["🌐 Edge Clients"]
        direction TB
        Web["🖥️ Next.js Web App<br/><small style='color:#94a3b8'>SSR / React 19</small>"]
        Mobile["📱 Mobile Native App<br/><small style='color:#94a3b8'>Swift & Kotlin</small>"]
        IoT["📡 Telemetry Nodes<br/><small style='color:#94a3b8'>MQTT Sensors</small>"]
    end

    subgraph Ingress["🛡️ Edge & Ingress Security"]
        direction TB
        CDN["⚡ Cloudflare Anycast CDN<br/><small style='color:#94a3b8'>TLS 1.3 / DDoS Shield</small>"]
        GW["🚪 Kong API Gateway<br/><small style='color:#94a3b8'>JWT Auth & Rate Limiter</small>"]
    end

    subgraph CoreServices["⚡ High-Performance Microservices"]
        direction TB
        Auth["🔐 Identity & IAM<br/><small style='color:#94a3b8'>OAuth2 / OIDC Engine</small>"]
        Workflow["🔄 Orchestration Engine<br/><small style='color:#94a3b8'>Temporal / Rust Worker</small>"]
        Inference["🧠 AI Inference Core<br/><small style='color:#94a3b8'>Triton / CUDA Tensor</small>"]
    end

    subgraph DataPipeline["🚀 Distributed Event & Data Lake"]
        direction TB
        Kafka{{"⚡ Apache Kafka Stream<br/><small style='color:#94a3b8'>100K msg/sec Event Bus</small>"}}
        Redis[("🔥 Redis Enterprise<br/><small style='color:#94a3b8'>Sub-millisecond Cache</small>")]
        Vector[("🔮 Milvus Vector DB<br/><small style='color:#94a3b8'>HNSW Dense Embeddings</small>")]
        Postgres[("💾 Postgres Aurora<br/><small style='color:#94a3b8'>Multi-Region Read Replicas</small>")]
    end

    Clients --> CDN
    CDN --> GW
    GW --> Auth
    GW --> Workflow
    GW --> Inference

    Auth <--> Redis
    Workflow --> Kafka
    Inference <--> Vector
    Workflow <--> Postgres
    Kafka --> Postgres

    classDef clientStyle fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#f8fafc,rx:8px,ry:8px;
    classDef securityStyle fill:#1e1b4b,stroke:#a855f7,stroke-width:2px,color:#f8fafc,rx:8px,ry:8px;
    classDef serviceStyle fill:#022c22,stroke:#10b981,stroke-width:2px,color:#f8fafc,rx:8px,ry:8px;
    classDef dataStyle fill:#18181b,stroke:#f59e0b,stroke-width:2px,color:#f8fafc,rx:8px,ry:8px;

    class Web,Mobile,IoT clientStyle;
    class CDN,GW securityStyle;
    class Auth,Workflow,Inference serviceStyle;
    class Kafka,Redis,Vector,Postgres dataStyle;`,

    sequence_auth: `sequenceDiagram
    autonumber
    box rgba(14,165,233,0.12) 🌐 Client Side
    actor User as 👤 End User
    participant App as 💻 Single Page App
    end

    box rgba(168,85,247,0.12) 🛡️ Identity & Gateway
    participant IDP as 🔐 OAuth2 / OIDC Provider
    participant GW as 🚪 API Edge Gateway
    end

    box rgba(16,185,129,0.12) ⚡ Microservices Mesh
    participant Core as ⚙️ Business Logic Service
    participant Hook as 📡 Webhook Dispatcher
    end

    box rgba(245,158,11,0.12) 🌍 Third-Party Partner
    participant Partner as 🏢 External Webhook Listener
    end

    User->>App: Click "Sign in with Enterprise SSO"
    App->>IDP: GET /authorize (PKCE challenge + state)
    IDP-->>User: Present Passkey / WebAuthn Biometric Prompt
    User->>IDP: Approve Hardware Token Signature
    IDP-->>App: Redirect with Authorization Code
    App->>IDP: POST /oauth/token (code + code_verifier)
    IDP-->>App: Return Signed RS256 JWT Access & Refresh Token

    rect rgba(56,189,248,0.08)
        Note over App,GW: Phase 2: Cryptographic API Dispatch
        App->>GW: POST /v1/transactions (Bearer Access Token)
        GW->>IDP: Validate JWT Signature against JWKS Keyset
        GW->>Core: Forward Sanitized Context + Principal ID
        Core-->>GW: Transaction Committed { status: "COMPLETED", id: "tx_9981" }
        GW-->>App: 200 OK Response with Confirmation
    end

    rect rgba(16,185,129,0.08)
        Note over Core,Partner: Phase 3: Reliable Asynchronous Webhook
        Core->>Hook: Enqueue Event "payment.succeeded"
        Hook->>Hook: Sign Payload with HMAC-SHA256 Secret
        Hook->>Partner: POST /webhook (X-Signature-SHA256)
        Partner-->>Hook: 200 Acknowledged
    end`,

    system_states: `stateDiagram-v2
    [*] --> Standby: Provision Virtual Machine Cluster

    state Standby {
        [*] --> Initializing
        Initializing --> ProbingNodes: Run Pre-flight Checks
        ReadyState --> [*]
        state ProbingNodes {
            direction LR
            MemCheck --> DiskCheck
            DiskCheck --> NetLatency
        }
        ProbingNodes --> ReadyState: All Checks Passed
    }

    Standby --> Synchronizing: Primary Leader Elected

    state Synchronizing {
        direction LR
        Region_US_East: 🛰️ Region US-East
        Region_EU_Central: 🛰️ Region EU-Central
        Region_AP_South: 🛰️ Region AP-South

        Region_US_East --> Region_EU_Central: Stream WAL Logs
        Region_EU_Central --> Region_AP_South: Quorum Ack
    }

    Synchronizing --> ActiveServing: Raft Consensus Validated (3/3)

    state ActiveServing {
        [*] --> SteadyLoad
        SteadyLoad --> BurstScaling: CPU > 80% or Queue > 500
        BurstScaling --> SteadyLoad: Scale-out Complete (+8 Nodes)
        SteadyLoad --> MaintenanceMode: Scheduled Patch Window
        MaintenanceMode --> SteadyLoad: Hot Reload Complete
    }

    ActiveServing --> DegradedCircuit: Network Partition Detected
    
    state DegradedCircuit {
        [*] --> IsolateFailedRegion
        IsolateFailedRegion --> ReRouteTraffic: Failover to Secondary
        ReRouteTraffic --> SelfHealingLoop: Auto-Remediate
    }

    SelfHealingLoop --> Synchronizing: Node Re-joined Quorum
    DegradedCircuit --> Terminated: Split-Brain Hard Timeout
    Terminated --> [*]`,

    database_entity: `erDiagram
    ORGANIZATION ||--o{ WORKSPACE : "provisions"
    ORGANIZATION ||--|| SUBSCRIPTION : "billed via"
    ORGANIZATION ||--o{ USER_ACCOUNT : "employs"
    USER_ACCOUNT ||--o{ API_CREDENTIAL : "generates"
    USER_ACCOUNT ||--o{ AUDIT_LOG : "initiates"
    WORKSPACE ||--o{ WORKFLOW_EXECUTION : "runs"
    WORKFLOW_EXECUTION ||--o{ MODEL_INFERENCE : "dispatches"

    ORGANIZATION {
        uuid id PK "Unique Tenant ID"
        string legal_name "Enterprise Name"
        string slug "Unique Domain URI"
        string plan_tier "Enterprise / Scale"
        timestamptz created_at "Creation ISO"
    }

    USER_ACCOUNT {
        uuid id PK "User ID"
        uuid organization_id FK "Tenant Foreign Key"
        string email "Verified Corporate Email"
        string role "Admin / Engineer / Analyst"
        boolean mfa_enforced "WebAuthn Enabled"
        timestamptz last_login_at "Activity Timestamp"
    }

    WORKSPACE {
        uuid id PK "Workspace ID"
        uuid organization_id FK "Tenant Foreign Key"
        string project_title "Display Name"
        jsonb permissions "RBAC Matrix JSON"
        boolean is_isolated "Dedicated Cluster Flag"
    }

    SUBSCRIPTION {
        uuid id PK "Billing Identifier"
        uuid organization_id FK "Tenant Foreign Key"
        string stripe_customer_id "Stripe ID"
        string billing_status "Active / Delinquent"
        numeric monthly_seat_quota "Allowed Seats"
        timestamptz renewal_date "Next Cycle"
    }

    WORKFLOW_EXECUTION {
        uuid id PK "Run Unique ID"
        uuid workspace_id FK "Workspace Foreign Key"
        string workflow_name "DAG Pipeline Name"
        string execution_state "SUCCESS / FAILED"
        int duration_ms "Latency in ms"
        timestamptz started_at "Dispatch Time"
    }

    MODEL_INFERENCE {
        uuid id PK "Inference Call ID"
        uuid execution_id FK "Workflow Foreign Key"
        string model_name "GPT-4o / Claude 3.5 / Gemini"
        int prompt_tokens "Input Token Count"
        int completion_tokens "Output Token Count"
        numeric cost_usd "Micro-dollar Cost"
    }

    API_CREDENTIAL {
        uuid id PK "Key ID"
        uuid user_id FK "Owner Foreign Key"
        string key_prefix "Public Identifier"
        string hashed_secret "Argon2id Hash"
        timestamptz expires_at "Expiration Date"
    }

    AUDIT_LOG {
        uuid id PK "Log Event ID"
        uuid user_id FK "Actor Foreign Key"
        string action "IAM_UPDATE / SECRET_ROTATE"
        inet client_ip "Client IPv4 / IPv6"
        timestamptz recorded_at "Tamper-evident Time"
    }`
};

window.mermaidTemplate = window.mermaidTemplates.architecture_flow;

/**
 * Renders Mermaid.js code into an iframe-compatible HTML string.
 * Supports responsive viewport scaling as per the preview screen size.
 *
 * @param {string} mermaidCode The raw Mermaid diagram code.
 * @param {Object|number|string} [options={}] Options object or legacy width.
 * @param {number|string} [legacyHeight] Legacy height if second param was width.
 * @returns {string} The full HTML document source for an iframe.
 */
window.renderMermaid = function(mermaidCode, options = {}, legacyHeight) {
    let width = 1280;
    let height = 720;
    let fitMode = 'auto'; // 'auto', 'widescreen', 'square', 'custom'
    let background = '#0a0d14';

    if (typeof options === 'object' && options !== null) {
        if (options.width) width = options.width;
        if (options.height) height = options.height;
        if (options.fitMode) fitMode = options.fitMode;
        if (options.background) background = options.background;
    } else if (typeof options === 'number' || typeof options === 'string') {
        width = options;
        if (legacyHeight) height = legacyHeight;
        fitMode = 'custom';
    }

    const codeToRender = (mermaidCode && mermaidCode.trim().length > 0)
        ? mermaidCode
        : (window.mermaidTemplate || window.mermaidTemplates.architecture_flow);

    // Escape backticks, backslashes, and template interpolation for safe embedding
    const escapedCode = codeToRender
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\${/g, '\\${');

    // Determine container CSS based on selected fit mode
    let stageStyle = 'width: 100%; height: 100%; max-width: 100%; max-height: 100%;';
    if (fitMode === 'widescreen') {
        stageStyle = 'width: 100%; height: 100%; aspect-ratio: 16 / 9; max-width: 100%; max-height: 100%;';
    } else if (fitMode === 'square') {
        stageStyle = 'width: 100%; height: 100%; aspect-ratio: 1 / 1; max-width: 100%; max-height: 100%;';
    } else if (fitMode === 'custom') {
        stageStyle = `width: ${width}px; height: ${height}px; max-width: 100%; max-height: 100%;`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mermaid.js Preview</title>
    <style>
        * {
            box-sizing: border-box;
        }
        html, body { 
            margin: 0; 
            padding: 0;
            width: 100%;
            height: 100%;
            background: ${background}; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: #f1f5f9;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            overflow: hidden;
            user-select: none;
        }
        #mermaid-stage {
            ${stageStyle}
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            box-sizing: border-box;
            position: relative;
        }
        #mermaid-container {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            overflow: hidden;
        }
        #mermaid-container svg {
            max-width: 100% !important;
            max-height: 100% !important;
            width: 100% !important;
            height: 100% !important;
            object-fit: contain;
            display: block;
            margin: auto;
            filter: drop-shadow(0 10px 25px rgba(0, 0, 0, 0.4));
            transition: transform 0.2s ease;
        }
        /* High contrast styling for text labels inside mermaid SVG */
        .node text, .cluster text, .label text {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            font-weight: 500 !important;
        }
        .error-card {
            background: rgba(239, 68, 68, 0.12);
            border: 1px solid rgba(239, 68, 68, 0.35);
            border-radius: 12px;
            padding: 20px 24px;
            color: #fca5a5;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 13px;
            line-height: 1.6;
            max-width: 80%;
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
            white-space: pre-wrap;
            word-break: break-word;
        }
        .error-title {
            color: #ef4444;
            font-weight: 700;
            font-size: 14px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
    </style>
</head>
<body>
    <div id="mermaid-stage">
        <div id="mermaid-container">
            <div style="color: #64748b; font-size: 13px; display: flex; align-items: center; gap: 8px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;">
                    <line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line>
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                    <line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line>
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                </svg>
                <span>Rendering Mermaid Diagram...</span>
            </div>
        </div>
    </div>
    <style>
        @keyframes spin { 100% { transform: rotate(360deg); } }
    </style>

    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"><\/script>
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            const container = document.getElementById('mermaid-container');
            try {
                mermaid.initialize({
                    startOnLoad: false,
                    theme: 'dark',
                    securityLevel: 'loose',
                    flowchart: {
                        useMaxWidth: true,
                        htmlLabels: true,
                        curve: 'basis',
                        padding: 16
                    },
                    sequence: {
                        useMaxWidth: true,
                        showSequenceNumbers: true,
                        boxMargin: 10,
                        mirrorActors: false
                    },
                    er: {
                        useMaxWidth: true,
                        layoutDirection: 'TB'
                    },
                    state: {
                        useMaxWidth: true
                    },
                    themeVariables: {
                        darkMode: true,
                        background: 'transparent',
                        mainBkg: '#12151e',
                        nodeBorder: '#38bdf8',
                        clusterBkg: 'rgba(15, 23, 42, 0.65)',
                        clusterBorder: '#334155',
                        lineColor: '#38bdf8',
                        textColor: '#f1f5f9',
                        fontSize: '14px',
                        primaryColor: '#1e293b',
                        primaryTextColor: '#f8fafc',
                        primaryBorderColor: '#6366f1',
                        secondaryColor: '#0f172a',
                        tertiaryColor: '#1e1b4b',
                        actorBkg: '#1e293b',
                        actorBorder: '#6366f1',
                        actorTextColor: '#f8fafc',
                        actorLineColor: '#64748b',
                        signalColor: '#38bdf8',
                        signalTextColor: '#f8fafc',
                        labelBoxBkgColor: '#1e293b',
                        labelBoxBorderColor: '#6366f1',
                        labelTextColor: '#f8fafc',
                        loopTextColor: '#cbd5e1',
                        noteBorderColor: '#f59e0b',
                        noteBkgColor: '#292524',
                        noteTextColor: '#fef3c7',
                        entityBorder: '#8b5cf6',
                        entityBkg: '#1e1b4b',
                        entityTextColor: '#f8fafc'
                    }
                });

                const code = \`${escapedCode}\`;
                const renderId = 'mermaid-svg-' + Math.floor(Math.random() * 1000000);

                mermaid.render(renderId, code).then(({ svg, bindFunctions }) => {
                    container.innerHTML = svg;
                    const svgEl = container.querySelector('svg');
                    if (svgEl) {
                        // Ensure responsive scaling without overflowing the preview screen
                        svgEl.removeAttribute('height');
                        svgEl.style.maxWidth = '100%';
                        svgEl.style.maxHeight = '100%';
                        svgEl.style.width = '100%';
                        svgEl.style.height = '100%';
                        svgEl.style.display = 'block';
                        svgEl.style.margin = 'auto';
                        if (!svgEl.getAttribute('preserveAspectRatio')) {
                            svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                        }
                    }
                    if (bindFunctions) {
                        bindFunctions(container);
                    }
                }).catch(e => {
                    console.error('Mermaid render error:', e);
                    container.innerHTML = '<div class="error-card"><div class="error-title">⚠️ Mermaid Syntax or Render Error</div>' + 
                        (e.message || e.str || String(e)) + '</div>';
                });

            } catch (err) {
                console.error('Mermaid init error:', err);
                container.innerHTML = '<div class="error-card"><div class="error-title">⚠️ Mermaid Initialization Error</div>' + 
                    (err.message || String(err)) + '</div>';
            }
        });
    <\/script>
</body>
</html>`;
};