import pandas as pd
import json
import requests
import io
import os

req_headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}

ISO_LIST = [
    'ARG', 'BRA', 'CHL', 'PRY', 'URY', 'BOL', 'COL', 'ECU', 'PER', 'VEN',
    'BLZ', 'CRI', 'SLV', 'GTM', 'HTI', 'HND', 'MEX', 'NIC', 'PAN', 'DOM',
    'BHS', 'BRB', 'GUY', 'JAM', 'SUR', 'TTO'
]

def fetch_hdi():
    print("Fetching HDI from UNDP...")
    url = "https://hdr.undp.org/sites/default/files/data/2024/HDR23-24_Composite_indices_complete_time_series.csv"
    try:
        req = requests.get(url, headers=req_headers)
        req.raise_for_status()
        
        df = pd.read_csv(io.StringIO(req.text))
        hdi_col = [c for c in df.columns if 'hdi' in c.lower() and '202' in c][-1] # Get latest HDI
        
        results = {}
        for iso in ISO_LIST:
            row = df[df['iso3'] == iso]
            if not row.empty:
                val = row.iloc[0][hdi_col]
                results[iso] = float(val) if pd.notna(val) else None
            else:
                results[iso] = None
        return results
    except Exception as e:
        print(f"Failed to fetch HDI: {e}")
        return {}

def fetch_ai_readiness():
    print("Fetching Oxford Insights AI Readiness...")
    url = "https://oxfordinsights.com/wp-content/uploads/2023/12/Government-AI-Readiness-Index-2023-Results.xlsx"
    try:
        req = requests.get(url, headers=req_headers)
        req.raise_for_status()
        
        df = pd.read_excel(io.BytesIO(req.content), header=1)
        
        name_map = {
            'ARG': 'Argentina', 'BRA': 'Brazil', 'CHL': 'Chile', 'PRY': 'Paraguay', 'URY': 'Uruguay',
            'BOL': 'Bolivia', 'COL': 'Colombia', 'ECU': 'Ecuador', 'PER': 'Peru', 'VEN': 'Venezuela',
            'BLZ': 'Belize', 'CRI': 'Costa Rica', 'SLV': 'El Salvador', 'GTM': 'Guatemala', 'HTI': 'Haiti',
            'HND': 'Honduras', 'MEX': 'Mexico', 'NIC': 'Nicaragua', 'PAN': 'Panama', 'DOM': 'Dominican Republic',
            'BHS': 'Bahamas', 'BRB': 'Barbados', 'GUY': 'Guyana', 'JAM': 'Jamaica', 'SUR': 'Suriname', 'TTO': 'Trinidad and Tobago'
        }
        
        results = {}
        score_col = None
        for c in df.columns:
            if 'total' in str(c).lower() and 'score' in str(c).lower():
                score_col = c
                break
        if not score_col:
            score_col = 'Total Score'
            
        country_col = None
        for c in df.columns:
            if 'country' in str(c).lower():
                country_col = c
                break
                
        if country_col and score_col in df.columns:
            for iso, cname in name_map.items():
                row = df[df[country_col] == cname]
                if not row.empty:
                    val = row.iloc[0][score_col]
                    results[iso] = float(val) if pd.notna(val) else None
                else:
                    results[iso] = None
        return results
    except Exception as e:
        print(f"Failed to fetch AI Readiness: {e}")
        return {}

def main():
    hdi = fetch_hdi()
    ai = fetch_ai_readiness()
    
    final = {}
    for iso in ISO_LIST:
        final[iso] = {
            'hdi': hdi.get(iso),
            'ai': ai.get(iso)
        }
    
    print(json.dumps(final, indent=2))

if __name__ == "__main__":
    main()
