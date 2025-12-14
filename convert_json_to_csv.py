#!/usr/bin/env python3
"""
Convert all LinkedIn post JSON files to CSV format.
This script processes all JSON files in the data folder and converts them to CSV.

Usage:
    python3 convert_json_to_csv.py
    
Or install dependencies first:
    pip install --user pandas numpy
    python3 convert_json_to_csv.py
"""

import json
import os
import glob
from datetime import datetime
from typing import List, Dict

try:
    import pandas as pd
    import numpy as np
except ImportError:
    print("Error: pandas and numpy are required.")
    print("Install them with: pip install --user pandas numpy")
    exit(1)

def clean_linkedin_post_data(posts: List[Dict]) -> List[Dict]:
    """
    Clean and validate LinkedIn post data.
    
    Args:
        posts: List of post dictionaries from JSON files
        
    Returns:
        List of cleaned post dictionaries
    """
    cleaned_posts = []
    seen_urns = set()
    
    issues = {
        'missing_text': 0,
        'empty_text': 0,
        'missing_stats': 0,
        'missing_author': 0,
        'missing_timestamp': 0,
        'duplicates': 0,
    }
    
    for post in posts:
        # Check for duplicates using activity_urn or full_urn
        urn = post.get('activity_urn') or post.get('full_urn')
        if urn and urn in seen_urns:
            issues['duplicates'] += 1
            continue
        if urn:
            seen_urns.add(urn)
        
        # Validate required fields
        if 'text' not in post:
            issues['missing_text'] += 1
            continue
        
        if not post['text'] or not post['text'].strip():
            issues['empty_text'] += 1
            continue
        
        if 'stats' not in post:
            issues['missing_stats'] += 1
            continue
        
        if 'author' not in post:
            issues['missing_author'] += 1
            continue
        
        if 'posted_at' not in post:
            issues['missing_timestamp'] += 1
            continue
        
        # Ensure all stats fields exist
        if 'stats' in post:
            stats = post['stats']
            for stat_key in ['total_reactions', 'like', 'love', 'celebrate', 'support', 'insight', 'comments', 'reposts']:
                if stat_key not in stats:
                    stats[stat_key] = 0
        
        # Infer source_company from author.name if missing
        if 'source_company' not in post or not post['source_company']:
            if 'author' in post and 'name' in post['author']:
                post['source_company'] = post['author']['name'].lower()
        
        # Trim whitespace from text
        post['text'] = post['text'].strip()
        
        # Remove null document fields
        if 'document' in post and post['document'] is None:
            del post['document']
        
        cleaned_posts.append(post)
    
    if any(issues.values()):
        print(f"  Cleaning issues: {issues}")
    
    return cleaned_posts


def transform_post_to_row(post: Dict) -> Dict:
    """
    Transform a single post dictionary to a flat row dictionary.
    """
    # Skip posts without required fields
    if not post.get('text') or not post.get('stats'):
        return None
    
    # Extract basic fields
    post_text = post.get('text', '')
    stats = post.get('stats', {})
    author = post.get('author', {})
    posted_at = post.get('posted_at', {})
    
    # Calculate engagement metrics
    total_reactions = stats.get('total_reactions', 0)
    like_count = stats.get('like', 0)
    love_count = stats.get('love', 0)
    celebrate_count = stats.get('celebrate', 0)
    support_count = stats.get('support', 0)
    insight_count = stats.get('insight', 0)
    comments_count = stats.get('comments', 0)
    reposts_count = stats.get('reposts', 0)
    
    # Calculate pct_positive (positive reactions / total reactions * 100)
    positive_reactions = like_count + love_count + celebrate_count + support_count
    if total_reactions > 0:
        pct_positive = (positive_reactions / total_reactions) * 100
        pct_negative = (insight_count / total_reactions) * 100
    else:
        pct_positive = 0.0
        pct_negative = 0.0
    
    # Audience size from follower count
    audience_size = author.get('follower_count', 0)
    if audience_size == 0:
        audience_size = 1000  # Default minimum
    
    # Calculate baseline engagement
    total_engagement = total_reactions + comments_count + reposts_count
    baseline_engagement = total_engagement / max(audience_size, 1)
    
    # Calculate comment sentiment distribution (normalized -1 to 1)
    if total_reactions > 0:
        comment_sentiment_dist = (pct_positive - pct_negative) / 100
        comment_sentiment_dist = np.clip(comment_sentiment_dist, -1, 1)
    else:
        comment_sentiment_dist = 0.0
    
    # Extract time window from timestamp
    timestamp = posted_at.get('timestamp', 0)
    if timestamp > 0:
        # Convert timestamp (milliseconds) to datetime
        post_datetime = datetime.fromtimestamp(timestamp / 1000)
        hour = post_datetime.hour
        weekday = post_datetime.weekday()  # 0 = Monday, 6 = Sunday
        
        if weekday >= 5:  # Saturday or Sunday
            time_window = 'weekend'
        elif hour < 12:
            time_window = 'morning'
        elif hour < 17:
            time_window = 'afternoon'
        else:
            time_window = 'evening'
    else:
        time_window = 'afternoon'  # Default
    
    # Extract affiliation from source_company
    affiliation = post.get('source_company', 'Unknown')
    if affiliation and isinstance(affiliation, str):
        affiliation = affiliation.capitalize()
    else:
        affiliation = 'Unknown'
    
    # Infer job_role from company name or use default
    company_name = affiliation.lower()
    if 'google' in company_name or 'microsoft' in company_name or 'apple' in company_name:
        job_role = 'Software Engineer'
    elif 'meta' in company_name or 'facebook' in company_name:
        job_role = 'Product Manager'
    else:
        job_role = 'Product Manager'  # Default for company posts
    
    # Account age - use default since we don't have account creation date
    account_age = 1825  # 5 years in days
    
    # Calculate engagement velocity
    if timestamp > 0:
        # Calculate post age in days
        current_time = datetime.now().timestamp() * 1000
        post_age_days = (current_time - timestamp) / (1000 * 60 * 60 * 24)
        
        # High engagement rate + recent post = high velocity
        engagement_rate = baseline_engagement
        if post_age_days < 1:  # Less than 1 day old
            velocity_factor = 0.9
        elif post_age_days < 7:  # Less than 1 week old
            velocity_factor = 0.7
        else:
            velocity_factor = 0.5
        
        engagement_velocity = min(engagement_rate * 10 * velocity_factor, 1.0)
        engagement_velocity = max(engagement_velocity, 0.0)
    else:
        engagement_velocity = 0.5  # Default
    
    return {
        'post_text': post_text,
        'job_role': job_role,
        'affiliation': affiliation,
        'account_age': account_age,
        'audience_size': audience_size,
        'baseline_engagement': baseline_engagement,
        'time_window': time_window,
        'pct_positive': pct_positive,
        'pct_negative': pct_negative,
        'comment_sentiment_dist': comment_sentiment_dist,
        'engagement_velocity': engagement_velocity,
    }


def convert_json_to_csv(json_file: str, output_file: str = None):
    """
    Convert a single JSON file to CSV.
    
    Args:
        json_file: Path to JSON file
        output_file: Path to output CSV file (optional, defaults to same name with .csv extension)
    """
    if output_file is None:
        output_file = json_file.replace('.json', '.csv')
    
    print(f"Processing {os.path.basename(json_file)}...")
    
    # Load JSON
    with open(json_file, 'r', encoding='utf-8') as f:
        posts = json.load(f)
    
    if not isinstance(posts, list):
        posts = [posts]
    
    print(f"  Loaded {len(posts)} posts")
    
    # Clean posts
    cleaned_posts = clean_linkedin_post_data(posts)
    print(f"  Cleaned: {len(cleaned_posts)} posts")
    
    # Transform to rows
    rows = []
    for post in cleaned_posts:
        row = transform_post_to_row(post)
        if row:
            rows.append(row)
    
    print(f"  Transformed: {len(rows)} rows")
    
    # Create DataFrame and save to CSV
    df = pd.DataFrame(rows)
    df.to_csv(output_file, index=False, encoding='utf-8')
    print(f"  ✓ Saved to {os.path.basename(output_file)} ({len(df)} rows, {len(df.columns)} columns)")
    
    return df


def main():
    """Convert all JSON files in the data folder to CSV."""
    data_folder = 'data'
    
    # Find all JSON files
    json_pattern = os.path.join(data_folder, '*.json')
    json_files = glob.glob(json_pattern)
    
    if not json_files:
        print(f"No JSON files found in {data_folder}")
        return
    
    print(f"Found {len(json_files)} JSON file(s) to convert...\n")
    
    # Convert each file
    all_dataframes = []
    for json_file in sorted(json_files):
        try:
            df = convert_json_to_csv(json_file)
            all_dataframes.append(df)
            print()
        except Exception as e:
            print(f"  ✗ Error processing {os.path.basename(json_file)}: {e}\n")
    
    # Optionally create a combined CSV
    if all_dataframes:
        combined_df = pd.concat(all_dataframes, ignore_index=True)
        combined_output = os.path.join(data_folder, 'all_posts_combined.csv')
        combined_df.to_csv(combined_output, index=False, encoding='utf-8')
        print(f"✓ Created combined CSV: {combined_output} ({len(combined_df)} total rows)")
    
    print("\n✓ Conversion complete!")


if __name__ == '__main__':
    main()
