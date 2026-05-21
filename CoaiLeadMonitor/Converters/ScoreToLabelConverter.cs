using Microsoft.UI.Xaml.Data;

namespace CoaiLeadMonitor.Converters;

public class ScoreToLabelConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, string language)
    {
        if (value is int score)
            return score switch { >= 8 => "HOT", >= 5 => "WARM", _ => "COLD" };
        return "UNKNOWN";
    }

    public object ConvertBack(object value, Type targetType, object parameter, string language)
        => throw new NotImplementedException();
}
