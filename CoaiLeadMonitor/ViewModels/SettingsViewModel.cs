using CommunityToolkit.Mvvm.ComponentModel;

namespace CoaiLeadMonitor.ViewModels;

public partial class SettingsViewModel : ObservableObject
{
    [ObservableProperty] private string apiUrl = "http://localhost:5000";
    [ObservableProperty] private bool autoRefresh = true;
    [ObservableProperty] private int refreshIntervalSeconds = 60;
    [ObservableProperty] private bool enableNotifications = true;
}
