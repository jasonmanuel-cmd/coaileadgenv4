using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using CoaiLeadMonitor.Models;

namespace CoaiLeadMonitor.Pages;

public sealed partial class DashboardPage : Page
{
    public DashboardPage()
    {
        InitializeComponent();
        LoadData();
    }

    private async void LoadData()
    {
        var stats = await App.LeadService.GetStatsAsync();
        TotalTile.Value = stats.Total.ToString();
        UnreadTile.Value = stats.Unread.ToString();
        SavedTile.Value = stats.Saved.ToString();
        ContactedTile.Value = stats.Contacted.ToString();
        TodayTile.Value = stats.NewToday.ToString();
        StatusText.Text = stats.IsFetching ? "Scanning..." : "Ready";

        var resp = await App.LeadService.GetLeadsAsync(limit: 10);
        RecentLeadsList.ItemsSource = resp.Leads;
    }

    private async void OnScanClick(object sender, RoutedEventArgs e)
    {
        StatusText.Text = "Scanning...";
        ScanBtn.IsEnabled = false;
        await App.LeadService.TriggerScanAsync();
        await Task.Delay(2000);
        LoadData();
        ScanBtn.IsEnabled = true;
    }
}
