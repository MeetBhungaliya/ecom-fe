import { Smartphone, Download, CheckCircle2, MonitorSmartphone } from 'lucide-react';

export default function DownloadAppPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 md:p-8 animate-in fade-in duration-500">
      <div className="text-center space-y-3 mt-4 mb-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
          <MonitorSmartphone className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Get the Mobile App</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Manage your e-commerce operations on the go. Download our native application for iOS and Android devices.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Android Card */}
        <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/60 p-8 text-center backdrop-blur-sm transition-all hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 hover:opacity-100 pointer-events-none" />
          
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 mb-6">
            <Smartphone className="h-8 w-8" />
          </div>
          
          <h2 className="text-xl font-bold mb-3">Android</h2>
          <ul className="text-sm text-muted-foreground space-y-2.5 mb-8 text-left max-w-[200px] mx-auto">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Push notifications
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Fast performance
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Direct APK install
            </li>
          </ul>

          <a 
            href="/app.apk" 
            download
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white transition-all hover:bg-emerald-600 active:scale-[0.98]"
          >
            <Download className="h-5 w-5" />
            Download APK
          </a>
          <p className="text-[11px] text-muted-foreground mt-4">
            Requires Android 8.0 or later
          </p>
        </div>

        {/* iOS Card */}
        <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/60 p-8 text-center backdrop-blur-sm transition-all hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 hover:opacity-100 pointer-events-none" />
          
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 mb-6">
            <Smartphone className="h-8 w-8" />
          </div>
          
          <h2 className="text-xl font-bold mb-3">iOS</h2>
          <ul className="text-sm text-muted-foreground space-y-2.5 mb-8 text-left max-w-[200px] mx-auto">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-500" /> Native feel
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-500" /> Face ID login
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-500" /> Beta access
            </li>
          </ul>

          <button 
            onClick={() => alert("iOS App Store submission is pending. TestFlight link will be available soon.")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <Download className="h-5 w-5" />
            Get on TestFlight
          </button>
          <p className="text-[11px] text-muted-foreground mt-4">
            Requires iOS 13.0 or later
          </p>
        </div>
      </div>
    </div>
  );
}
