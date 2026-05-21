using Microsoft.UI.Xaml;
using CoaiLeadMonitor.Services;

namespace CoaiLeadMonitor;

public partial class App : Application
{
    private Window? _window;

    public static ILeadService LeadService { get; private set; } = null!;
    public static ScanWebSocket ScanWs { get; private set; } = null!;

    public App()
    {
        InitializeComponent();

        var http = new HttpClient { BaseAddress = new Uri("http://localhost:5000") };
        var ws = new ScanWebSocket("http://localhost:5000");
        LeadService = new LeadService(http);
        ScanWs = ws;

        _ = ws.ConnectAsync();
    }

    protected override void OnLaunched(Microsoft.UI.Xaml.LaunchActivatedEventArgs args)
    {
        _window = new MainWindow();
        _window.Activate();
    }
}
