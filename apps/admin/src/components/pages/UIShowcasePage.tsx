import React, { useState, useRef } from 'react';
import {
  Table,
  Tag as AntdTag,
  Segmented,
  Tour,
  Slider,
  Rate,
  QRCode,
  Select,
  Progress,
  message,
  notification
} from 'antd';
import {
  Sparkles,
  Layers,
  Code,
  Info,
  CheckCircle,
  Play,
  Settings,
  HelpCircle,
  ExternalLink,
  Plus,
  Send,
  Zap,
  Check,
  AlertCircle
} from 'lucide-react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Switch,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@vokop/ui/shadcn';
import { AntdProvider } from '@vokop/ui/antd';

import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { showcaseTableData } from '../../constants/mockData';

export const UIShowcasePage: React.FC = () => {
  const { theme } = useTheme();
  const { addNotification } = useNotifications();

  // Selected library tab
  const [activeSegment, setActiveSegment] = useState<'all' | 'shadcn' | 'antd'>('all');

  // Interactive states
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [performanceThreshold, setPerformanceThreshold] = useState(75);
  const [serviceRating, setServiceRating] = useState(5);
  
  // Dialog inputs
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvent, setWebhookEvent] = useState('order.completed');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Antd Tour refs
  const tourBtnRef = useRef<HTMLButtonElement>(null);
  const shadcnCardRef = useRef<HTMLDivElement>(null);
  const antdCardRef = useRef<HTMLDivElement>(null);
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Message API for antd
  const [messageApi, messageContextHolder] = message.useMessage();

  // Setup tour steps
  const tourSteps = [
    {
      title: 'UI Libraries Hub',
      description: 'Welcome to the consolidated UI Hub demonstrating both shadcn/ui and Ant Design running in complete harmony.',
      target: () => tourBtnRef.current!,
    },
    {
      title: 'shadcn/ui Showcase',
      description: 'These components are built with Radix primitives and styled with Tailwind CSS utility classes. They are fully customizable and light weight.',
      target: () => shadcnCardRef.current!,
    },
    {
      title: 'Ant Design components',
      description: 'Antd provides robust, highly interactive enterprise components like Tables, Progress bars, Sliders, and QR Codes, custom-themed to match your system theme.',
      target: () => antdCardRef.current!,
    },
  ];

  // Antd Table Data Source
  const tableData = showcaseTableData;

  const tableColumns = [
    {
      title: 'Micro-Service',
      dataIndex: 'service',
      key: 'service',
      render: (text: string) => <span className="font-semibold text-xs text-[var(--text)]">{text}</span>
    },
    {
      title: 'Endpoint',
      dataIndex: 'endpoint',
      key: 'endpoint',
      render: (text: string) => <code className="text-[11px] font-mono bg-white/5 border border-white/8 px-1.5 py-0.5 rounded text-[var(--text-mid)]">{text}</code>
    },
    {
      title: 'Uptime',
      dataIndex: 'uptime',
      key: 'uptime',
      render: (uptime: number) => (
        <span className="font-mono text-xs text-[var(--text-mid)]">
          {uptime}%
        </span>
      )
    },
    {
      title: 'Latency',
      dataIndex: 'latency',
      key: 'latency',
      render: (text: string) => (
        <span className="font-mono text-xs text-amber-400">
          {text}
        </span>
      )
    },
    {
      title: 'Status',
      key: 'status',
      dataIndex: 'status',
      render: (status: string) => {
        const color = status === 'healthy' ? 'success' : 'warning';
        return (
          <AntdTag color={color} className="uppercase font-bold tracking-wider text-[9px] px-2 py-0.5 rounded-full">
            {status}
          </AntdTag>
        );
      }
    }
  ];

  // Handle registering a mock webhook from the shadcn dialog
  const handleRegisterWebhook = () => {
    if (!webhookUrl.trim()) {
      messageApi.error('Please specify a valid webhook endpoint URL!');
      return;
    }
    
    // Simulate register
    setIsDialogOpen(false);
    messageApi.success(`Successfully registered webhook to target ${webhookUrl}!`);
    addNotification(
      'System Configuration',
      `Registered webhook webhook for trigger event: ${webhookEvent}`,
      'system'
    );
    setWebhookUrl('');
  };

  const handleStartSimulation = () => {
    setIsSimulationActive(true);
    messageApi.loading({ content: 'Starting system sandbox simulation...', key: 'sim' });
    setTimeout(() => {
      messageApi.success({ content: 'Sandbox simulation live!', key: 'sim', duration: 2 });
    }, 1200);
  };

  const handleStopSimulation = () => {
    setIsSimulationActive(false);
    messageApi.info('Simulation terminated. Restoring default parameters.');
  };

  return (
    <AntdProvider theme={theme}>
      {messageContextHolder}
      
      <div className="space-y-6">
        {/* Banner with modern glassmorphism */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-r from-indigo-900/40 via-purple-950/30 to-black/20 p-6 md:p-8 shadow-xl">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Layers className="w-40 h-40 text-white" />
          </div>

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-xs font-semibold text-indigo-300 mb-4 select-none animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Full UI Support Live</span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text)] tracking-tight leading-tight">
              Enterprise UI Support Hub
            </h1>
            <p className="text-xs md:text-sm text-[var(--text-dim)] mt-2 leading-relaxed">
              Leverage both <strong>shadcn/ui</strong> (Radix primitives styled with Tailwind classes) and <strong>Ant Design</strong> (highly interactive stateful widgets) simultaneously. This combo matches design tokens with active system themes seamlessly.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-6">
              <button
                ref={tourBtnRef}
                onClick={() => setIsTourOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all cursor-pointer shadow-[0_4px_12px_rgba(99,102,241,0.25)] hover:shadow-[0_4px_20px_rgba(99,102,241,0.4)]"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Start Interactive Tour</span>
              </button>

              <a
                href="https://ant.design"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/8 bg-white/4 hover:bg-white/8 text-[var(--text-mid)] hover:text-[var(--text)] font-semibold text-xs transition-colors cursor-pointer"
              >
                <span>Antd Docs</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <a
                href="https://ui.shadcn.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/8 bg-white/4 hover:bg-white/8 text-[var(--text-mid)] hover:text-[var(--text)] font-semibold text-xs transition-colors cursor-pointer"
              >
                <span>shadcn/ui Docs</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Library Filter segmented bar */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <Code className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-bold text-[var(--text)]">Filtered Sandbox Playground</span>
          </div>

          <Segmented
            options={[
              { label: 'All Libraries', value: 'all' },
              { label: 'shadcn/ui', value: 'shadcn' },
              { label: 'Ant Design', value: 'antd' }
            ]}
            value={activeSegment}
            onChange={(value) => setActiveSegment(value as any)}
            className="p-1 bg-white/2 border border-white/5 font-semibold text-xs rounded-xl"
          />
        </div>

        {/* Components Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          
          {/* LEFT SIDE: SHADCN/UI (RADIX + TAILWIND) */}
          {(activeSegment === 'all' || activeSegment === 'shadcn') && (
            <div ref={shadcnCardRef}>
              <Card className="bg-[var(--panel-solid)] border-[var(--border)] shadow-lg hover:shadow-xl transition-shadow duration-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-[var(--text)]">shadcn/ui Sandbox</CardTitle>
                      <CardDescription className="text-xs text-[var(--text-dim)]">Radix primitive components styled via pure Tailwind utility classes.</CardDescription>
                    </div>
                    <Badge variant="outline" className="border-indigo-400/20 text-indigo-300 font-semibold select-none">
                      Tailwind-First
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Buttons Section */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] select-none">Button Variants</h3>
                    <div className="flex flex-wrap gap-2.5">
                      <Button variant="default" className="text-xs font-semibold cursor-pointer">Default</Button>
                      <Button variant="secondary" className="text-xs font-semibold cursor-pointer">Secondary</Button>
                      <Button variant="outline" className="text-xs font-semibold cursor-pointer">Outline</Button>
                      <Button variant="destructive" className="text-xs font-semibold cursor-pointer">Destructive</Button>
                      <Button variant="ghost" className="text-xs font-semibold cursor-pointer">Ghost</Button>
                    </div>
                  </div>

                  {/* Badges Section */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] select-none">Badge Variants</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="default">Primary Badge</Badge>
                      <Badge variant="secondary">Secondary Badge</Badge>
                      <Badge variant="outline">Outline Badge</Badge>
                      <Badge variant="destructive">Destructive Badge</Badge>
                    </div>
                  </div>

                  {/* Switch and interactive settings toggles */}
                  <div className="space-y-3 bg-white/2 border border-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-xs font-bold text-[var(--text)]">Simulate Live Daemon Service</label>
                        <p className="text-[11px] text-[var(--text-dim)]">Run background sync validation ticks and mock memory alerts.</p>
                      </div>
                      <Switch
                        checked={isSimulationActive}
                        onCheckedChange={(checked) => {
                          if (checked) handleStartSimulation();
                          else handleStopSimulation();
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                      <div className="space-y-0.5">
                        <label className="text-xs font-bold text-[var(--text)]">Compact Layout Density</label>
                        <p className="text-[11px] text-[var(--text-dim)]">Tighten table row spacing and decrease button sizes globally.</p>
                      </div>
                      <Switch
                        checked={compactMode}
                        onCheckedChange={(checked) => {
                          setCompactMode(checked);
                          messageApi.info(`Density set to ${checked ? 'Compact' : 'Default'}`);
                        }}
                      />
                    </div>
                  </div>

                  {/* Fully functional modal using shadcn Dialog */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] select-none">Interactive Modal Dialog</h3>
                    
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger
                        render={
                          <Button variant="outline" className="w-full text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer h-10 border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/10" />
                        }
                      >
                        <Plus className="w-4 h-4" />
                        <span>Register New Webhook Endpoint</span>
                      </DialogTrigger>
                      
                      <DialogContent className="sm:max-w-md bg-[var(--panel-solid)] border-[var(--border)] text-[var(--text)] rounded-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-base font-bold text-[var(--text)] flex items-center gap-2">
                            <Zap className="w-5 h-5 text-indigo-400" />
                            <span>Register Delivery Webhook</span>
                          </DialogTitle>
                          <DialogDescription className="text-xs text-[var(--text-dim)]">
                            Specify an endpoint. The service daemon will push automated payload deliveries securely via SHA-256 HMAC signature.
                          </DialogDescription>
                        </DialogHeader>

                        {/* Mixed libraries trigger: Using an antd select inside a shadcn dialog */}
                        <div className="space-y-4 py-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-[var(--text-mid)]">Target Webhook Endpoint URL</label>
                            <input
                              type="text"
                              placeholder="https://your-domain.com/webhook"
                              value={webhookUrl}
                              onChange={(e) => setWebhookUrl(e.target.value)}
                              className="w-full bg-white/4 border border-[var(--border)] px-3 py-2 rounded-xl text-xs text-[var(--text)] placeholder-[var(--text-dim)] outline-none focus:border-indigo-500 transition-colors h-10"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-[var(--text-mid)]">Triggering Event Type</label>
                            {/* Antd Select inside shadcn modal */}
                            <Select
                              defaultValue="order.completed"
                              value={webhookEvent}
                              onChange={(val) => setWebhookEvent(val)}
                              className="w-full h-10"
                              popupClassName="bg-[#111115] border border-white/10 rounded-xl"
                              options={[
                                { label: 'Order Completed (order.completed)', value: 'order.completed' },
                                { label: 'Key Out-Of-Stock (stock.empty)', value: 'stock.empty' },
                                { label: 'Refund Claim Created (refund.claimed)', value: 'refund.claimed' },
                                { label: 'KYC Verification Update (kyc.updated)', value: 'kyc.updated' },
                              ]}
                            />
                          </div>
                        </div>

                        <DialogFooter className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4 mt-2">
                          <DialogClose
                            render={
                              <Button type="button" variant="ghost" className="text-xs font-semibold cursor-pointer" />
                            }
                          >
                            Cancel
                          </DialogClose>
                          <Button
                            type="button"
                            onClick={handleRegisterWebhook}
                            className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer px-4"
                          >
                            Register Webhook
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>

                <CardFooter className="border-t border-[var(--border)] bg-white/2 py-3 px-6 flex items-center gap-2 select-none">
                  <Info className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[11px] text-[var(--text-dim)]">
                    All components are fully interactive with state syncing.
                  </span>
                </CardFooter>
              </Card>
            </div>
          )}

          {/* RIGHT SIDE: ANT DESIGN (ANTD) */}
          {(activeSegment === 'all' || activeSegment === 'antd') && (
            <div ref={antdCardRef} className="space-y-6">
              {/* Antd Card wrapping Table & controls */}
              <div className="bg-[var(--panel-solid)] border border-[var(--border)] rounded-2xl shadow-lg p-5 hover:shadow-xl transition-shadow duration-200">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                  <div>
                    <h2 className="text-base font-bold text-[var(--text)] flex items-center gap-1.5">
                      Ant Design Playground
                    </h2>
                    <p className="text-xs text-[var(--text-dim)]">Stateful enterprise-ready UI widgets featuring native JSON algorithms.</p>
                  </div>
                  <AntdTag color="indigo" className="font-bold uppercase tracking-wider text-[9px] px-2.5 py-0.5 rounded-full select-none">
                    Stateful
                  </AntdTag>
                </div>

                <div className="space-y-6">
                  {/* Uptime micro-services table */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] select-none">Micro-Services Health</h3>
                    <div className="overflow-x-auto border border-white/5 rounded-xl">
                      <Table
                        columns={tableColumns}
                        dataSource={tableData}
                        pagination={false}
                        size={compactMode ? 'small' : 'middle'}
                        className="bg-transparent border-none"
                      />
                    </div>
                  </div>

                  {/* Performance simulation rate controller */}
                  <div className="space-y-3 bg-white/2 border border-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[var(--text)]">Sandbox Refresh Frequency</label>
                      <span className="font-mono text-xs font-bold text-indigo-400">{performanceThreshold}ms</span>
                    </div>
                    <Slider
                      min={10}
                      max={1000}
                      value={performanceThreshold}
                      onChange={(val) => setPerformanceThreshold(val)}
                      tooltip={{ formatter: (val) => `${val}ms` }}
                    />

                    {/* Progress indicator */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-[11px] text-[var(--text-dim)]">
                        <span>Simulation Queue Status</span>
                        <span>{isSimulationActive ? 'Ticking Live' : 'Pausable'}</span>
                      </div>
                      <Progress
                        percent={isSimulationActive ? 92 : 35}
                        status={isSimulationActive ? 'active' : 'normal'}
                        strokeColor={{
                          from: '#10b981',
                          to: '#6366f1',
                        }}
                      />
                    </div>
                  </div>

                  {/* Mixed Layout: QR Code generator and Rating panel */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/2 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text)]">Mobile Authenticator link</h4>
                        <p className="text-[10px] text-[var(--text-dim)] mt-0.5">Scan to sync settings securely to your mobile app.</p>
                      </div>
                      <div className="flex justify-center py-2.5">
                        <QRCode
                          value="https://ai.studio/build"
                          size={110}
                          bordered={false}
                          color={theme === 'light' ? '#000000' : '#ffffff'}
                        />
                      </div>
                    </div>

                    <div className="bg-white/2 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text)]">Rate UI Flexibility</h4>
                        <p className="text-[10px] text-[var(--text-dim)] mt-0.5">Your evaluation helps us scale the underlying design token parser.</p>
                      </div>
                      <div className="space-y-3 py-4">
                        <div className="flex justify-center">
                          <Rate value={serviceRating} onChange={(val) => setServiceRating(val)} />
                        </div>
                        <p className="text-center text-xs font-semibold text-[var(--text-mid)]">
                          Selected rating: <span className="text-indigo-400 font-bold">{serviceRating}/5 Stars</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Antd Tour component */}
        <Tour
          open={isTourOpen}
          onClose={() => setIsTourOpen(false)}
          steps={tourSteps}
        />
      </div>
    </AntdProvider>
  );
};
