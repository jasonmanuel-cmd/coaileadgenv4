using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CoaiLeadMonitor.Models;
using CoaiLeadMonitor.Services;

namespace CoaiLeadMonitor.ViewModels;

public partial class LeadsViewModel : ObservableObject
{
    private readonly ILeadService _leadService;
    private readonly ScanWebSocket _ws;

    [ObservableProperty] private ObservableCollection<Lead> leads = new();
    [ObservableProperty] private ObservableCollection<string> cities = new();
    [ObservableProperty] private string? selectedCity;
    [ObservableProperty] private string? searchKeyword;
    [ObservableProperty] private string? selectedStatus;
    [ObservableProperty] private bool isLoading;
    [ObservableProperty] private int totalCount;
    [ObservableProperty] private int currentPage = 1;
    private const int PageSize = 30;

    public LeadsViewModel(ILeadService leadService, ScanWebSocket ws)
    {
        _leadService = leadService;
        _ws = ws;
        _ws.OnScanCompleted += async () => await LoadLeadsAsync();
    }

    [RelayCommand]
    private async Task LoadLeadsAsync()
    {
        IsLoading = true;
        var resp = await _leadService.GetLeadsAsync(SelectedCity, SearchKeyword,
            SelectedStatus, CurrentPage, PageSize);
        TotalCount = resp.Total;
        Leads = new ObservableCollection<Lead>(resp.Leads);
        IsLoading = false;
    }

    [RelayCommand]
    private async Task LoadCitiesAsync()
    {
        var stats = await _leadService.GetStatsAsync();
        Cities = new ObservableCollection<string>(stats.Cities?.Select(c => c.Id) ?? Enumerable.Empty<string>());
    }

    [RelayCommand]
    private async Task MarkReadAsync(Lead lead)
    {
        var updated = await _leadService.UpdateLeadAsync(lead.Id, isRead: !lead.IsRead);
        if (updated != null) lead.IsRead = updated.IsRead;
    }

    [RelayCommand]
    private async Task ToggleSaveAsync(Lead lead)
    {
        var updated = await _leadService.UpdateLeadAsync(lead.Id, isSaved: !lead.IsSaved);
        if (updated != null) lead.IsSaved = updated.IsSaved;
    }

    [RelayCommand]
    private async Task ToggleContactedAsync(Lead lead)
    {
        var updated = await _leadService.UpdateLeadAsync(lead.Id, isContacted: !lead.IsContacted);
        if (updated != null) lead.IsContacted = updated.IsContacted;
    }

    [RelayCommand]
    private async Task DeleteLeadAsync(Lead lead)
    {
        var ok = await _leadService.DeleteLeadAsync(lead.Id);
        if (ok) Leads.Remove(lead);
    }

    partial void OnSelectedCityChanged(string? value) => _ = LoadLeadsAsync();
    partial void OnSearchKeywordChanged(string? value) => _ = LoadLeadsAsync();
    partial void OnSelectedStatusChanged(string? value) => _ = LoadLeadsAsync();
}
