using CommunityToolkit.Mvvm.ComponentModel;

namespace CoaiLeadMonitor.ViewModels;

public partial class AboutViewModel : ObservableObject
{
    public string AppName => "Coai Lead Monitor";
    public string Version => "1.0.0";
    public string Description => "Desktop client for monitoring and managing leads from the COAI lead tracker API.";
    public string BackendUrl => "http://localhost:5000";
}
