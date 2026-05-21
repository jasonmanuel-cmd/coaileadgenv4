using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;

namespace CoaiLeadMonitor.Pages;

public sealed partial class LeadsPage : Page
{
    private string? _selectedCity;
    private string? _searchKeyword;
    private string? _selectedStatus;

    public LeadsPage()
    {
        InitializeComponent();
        LoadCities();
        LoadLeads();
    }

    private async void LoadCities()
    {
        var stats = await App.LeadService.GetStatsAsync();
        if (stats.Cities != null)
        {
            CityFilter.Items.Add(new ComboBoxItem { Content = "All Cities", Tag = "" });
            foreach (var c in stats.Cities)
                CityFilter.Items.Add(new ComboBoxItem { Content = c.Label, Tag = c.Id });
        }
    }

    private async void LoadLeads()
    {
        var resp = await App.LeadService.GetLeadsAsync(
            city: _selectedCity, keyword: _searchKeyword,
            status: _selectedStatus, page: 1, limit: 50);
        LeadsList.ItemsSource = resp.Leads;
    }

    private void OnFilterChanged(object sender, SelectionChangedEventArgs e)
    {
        if (sender == CityFilter && CityFilter.SelectedItem is ComboBoxItem ci)
            _selectedCity = ci.Tag as string;
        if (sender == StatusFilter && StatusFilter.SelectedItem is ComboBoxItem si)
            _selectedStatus = si.Tag as string;
        LoadLeads();
    }

    private void OnSearchChanged(object sender, TextChangedEventArgs e)
    {
        _searchKeyword = SearchBox.Text;
        LoadLeads();
    }

    private void OnRefreshClick(object sender, RoutedEventArgs e)
    {
        LoadLeads();
    }
}
