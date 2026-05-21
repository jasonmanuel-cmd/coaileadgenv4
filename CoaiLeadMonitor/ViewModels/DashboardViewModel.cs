using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CoaiLeadMonitor.Models;
using CoaiLeadMonitor.Services;

namespace CoaiLeadMonitor.ViewModels;

public partial class DashboardViewModel : ObservableObject
{
    private readonly ILeadService _leadService;
    private readonly ScanWebSocket _ws;

    [ObservableProperty] private int totalLeads;
    [ObservableProperty] private int unreadLeads;
    [ObservableProperty] private int savedLeads;
    [ObservableProperty] private int contactedLeads;
    [ObservableProperty] private int newToday;
    [ObservableProperty] private bool isFetching;
    [ObservableProperty] private string lastFetched = "";
    [ObservableProperty] private string statusText = "Ready";
    [ObservableProperty] private ObservableCollection<Lead> recentLeads = new();

    public DashboardViewModel(ILeadService leadService, ScanWebSocket ws)
    {
        _leadService = leadService;
        _ws = ws;
        _ws.OnScanCompleted += async () => await LoadDataAsync();
    }

    [RelayCommand]
    private async Task LoadDataAsync()
    {
        StatusText = "Loading...";
        var stats = await _leadService.GetStatsAsync();
        TotalLeads = stats.Total;
        UnreadLeads = stats.Unread;
        SavedLeads = stats.Saved;
        ContactedLeads = stats.Contacted;
        NewToday = stats.NewToday;
        IsFetching = stats.IsFetching;
        LastFetched = stats.LastFetched ?? "Never";
        StatusText = "Ready";

        var resp = await _leadService.GetLeadsAsync(limit: 10);
        RecentLeads = new ObservableCollection<Lead>(resp.Leads);
    }

    [RelayCommand]
    private async Task TriggerScanAsync()
    {
        StatusText = "Scanning...";
        await _leadService.TriggerScanAsync();
    }
}
