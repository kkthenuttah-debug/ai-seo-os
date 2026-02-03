-- AI SEO OS - Seed Data for Testing
-- Run this after applying migrations to populate test data

-- NOTE: This seed file assumes you have created auth users in Supabase Auth first
-- Replace 'auth_user_uuid_1' and 'auth_user_uuid_2' with actual auth.user IDs

-- ============================================================================
-- TEST USERS
-- ============================================================================

INSERT INTO users (id, email, auth_id, company_name, created_at, updated_at)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'demo@aiseoos.com', 'auth_user_uuid_1', 'Demo Company Inc.', NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440002', 'test@example.com', 'auth_user_uuid_2', 'Test Organization LLC', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TEST PROJECTS
-- ============================================================================

INSERT INTO projects (
    id, user_id, name, domain, wordpress_url, wordpress_username, 
    wordpress_password_encrypted, status, settings, created_at, updated_at
)
VALUES 
    (
        '660e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440001',
        'SaaS SEO Automation',
        'saas-seo-demo.com',
        'https://saas-seo-demo.com',
        'admin',
        'encrypted_password_placeholder',
        'active',
        '{
            "niche": "SaaS SEO Tools",
            "target_audience": "Marketing teams and SEO professionals",
            "keywords": ["seo automation", "ai seo", "content optimization"],
            "content_tone": "professional",
            "monetization_strategy": "subscription",
            "auto_optimize": true,
            "publish_frequency": "weekly"
        }'::jsonb,
        NOW() - INTERVAL '30 days',
        NOW()
    ),
    (
        '660e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440001',
        'E-commerce Health Supplements',
        'healthsupplements-demo.com',
        'https://healthsupplements-demo.com',
        'admin',
        'encrypted_password_placeholder',
        'active',
        '{
            "niche": "Health & Wellness",
            "target_audience": "Health-conscious consumers",
            "keywords": ["vitamin supplements", "protein powder", "wellness products"],
            "content_tone": "friendly",
            "monetization_strategy": "affiliate",
            "auto_optimize": true,
            "publish_frequency": "daily"
        }'::jsonb,
        NOW() - INTERVAL '15 days',
        NOW()
    ),
    (
        '660e8400-e29b-41d4-a716-446655440003',
        '550e8400-e29b-41d4-a716-446655440002',
        'Local Plumbing Services',
        'plumber-demo.com',
        'https://plumber-demo.com',
        'admin',
        'encrypted_password_placeholder',
        'paused',
        '{
            "niche": "Local Services",
            "target_audience": "Homeowners needing plumbing services",
            "keywords": ["emergency plumber", "pipe repair", "drain cleaning"],
            "content_tone": "trustworthy",
            "monetization_strategy": "leads",
            "auto_optimize": false,
            "publish_frequency": "biweekly"
        }'::jsonb,
        NOW() - INTERVAL '60 days',
        NOW()
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TEST INTEGRATIONS
-- ============================================================================

INSERT INTO integrations (
    id, project_id, type, access_token_encrypted, refresh_token_encrypted,
    expires_at, data, status, last_sync_at, created_at, updated_at
)
VALUES 
    (
        '770e8400-e29b-41d4-a716-446655440001',
        '660e8400-e29b-41d4-a716-446655440001',
        'gsc',
        'encrypted_access_token_gsc_1',
        'encrypted_refresh_token_gsc_1',
        NOW() + INTERVAL '1 hour',
        '{"site_url": "https://saas-seo-demo.com", "property_set_id": "sc-domain:saas-seo-demo.com"}'::jsonb,
        'active',
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '30 days',
        NOW() - INTERVAL '2 hours'
    ),
    (
        '770e8400-e29b-41d4-a716-446655440002',
        '660e8400-e29b-41d4-a716-446655440001',
        'wordpress',
        NULL,
        NULL,
        NULL,
        '{"site_url": "https://saas-seo-demo.com", "api_endpoint": "/wp-json/wp/v2"}'::jsonb,
        'active',
        NOW() - INTERVAL '1 hour',
        NOW() - INTERVAL '30 days',
        NOW() - INTERVAL '1 hour'
    ),
    (
        '770e8400-e29b-41d4-a716-446655440003',
        '660e8400-e29b-41d4-a716-446655440001',
        'elementor',
        NULL,
        NULL,
        NULL,
        '{"version": "3.18.0", "pro_enabled": true}'::jsonb,
        'active',
        NOW() - INTERVAL '1 hour',
        NOW() - INTERVAL '30 days',
        NOW() - INTERVAL '1 hour'
    ),
    (
        '770e8400-e29b-41d4-a716-446655440004',
        '660e8400-e29b-41d4-a716-446655440002',
        'gsc',
        'encrypted_access_token_gsc_2',
        'encrypted_refresh_token_gsc_2',
        NOW() + INTERVAL '30 minutes',
        '{"site_url": "https://healthsupplements-demo.com"}'::jsonb,
        'active',
        NOW() - INTERVAL '30 minutes',
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '30 minutes'
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TEST PAGES
-- ============================================================================

INSERT INTO pages (
    id, project_id, title, slug, content, meta_title, meta_description,
    meta_keywords, elementor_data, internal_links, status, publish_status,
    wordpress_post_id, published_at, created_at, updated_at
)
VALUES 
    -- Project 1 Pages
    (
        '880e8400-e29b-41d4-a716-446655440001',
        '660e8400-e29b-41d4-a716-446655440001',
        'The Ultimate Guide to AI SEO Automation',
        'ai-seo-automation-guide',
        '<h1>The Ultimate Guide to AI SEO Automation</h1><p>AI SEO automation is revolutionizing how businesses approach search engine optimization...</p>',
        'AI SEO Automation: Complete Guide 2024 | SaaS SEO Tools',
        'Learn how AI SEO automation can transform your digital marketing strategy. Discover tools, techniques, and best practices.',
        'ai seo, automation, digital marketing, seo tools',
        '{"version": "3.18.0", "sections": [{"id": "hero", "type": "hero"}, {"id": "content", "type": "text-editor"}]}'::jsonb,
        '["/blog/seo-tools", "/features/content-optimization"]'::jsonb,
        'optimized',
        'published',
        42,
        NOW() - INTERVAL '7 days',
        NOW() - INTERVAL '14 days',
        NOW() - INTERVAL '1 day'
    ),
    (
        '880e8400-e29b-41d4-a716-446655440002',
        '660e8400-e29b-41d4-a716-446655440001',
        '10 Best Content Optimization Tools in 2024',
        'best-content-optimization-tools',
        '<h1>10 Best Content Optimization Tools</h1><p>Content optimization is crucial for SEO success...</p>',
        '10 Best Content Optimization Tools for 2024 | Rank Higher',
        'Discover the top content optimization tools that can help you rank higher in search results. Expert reviews and comparisons included.',
        'content optimization, seo tools, content marketing',
        '{"version": "3.18.0", "sections": [{"id": "intro", "type": "text-editor"}, {"id": "list", "type": "accordion"}]}'::jsonb,
        '["/ai-seo-automation-guide", "/blog/seo-strategy"]'::jsonb,
        'published',
        'published',
        43,
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '2 days'
    ),
    (
        '880e8400-e29b-41d4-a716-446655440003',
        '660e8400-e29b-41d4-a716-446655440001',
        'How to Build an Internal Linking Strategy',
        'internal-linking-strategy',
        '<h1>How to Build an Internal Linking Strategy</h1><p>Internal linking is one of the most underutilized SEO tactics...</p>',
        'Internal Linking Strategy: Boost Your SEO in 2024',
        'Master internal linking with our comprehensive strategy guide. Improve crawlability, distribute link equity, and boost rankings.',
        'internal linking, seo strategy, link building',
        '{}'::jsonb,
        '["/ai-seo-automation-guide"]'::jsonb,
        'draft',
        'pending',
        NULL,
        NULL,
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '2 days'
    ),
    -- Project 2 Pages
    (
        '880e8400-e29b-41d4-a716-446655440004',
        '660e8400-e29b-41d4-a716-446655440002',
        'Top 5 Protein Powders for Muscle Growth',
        'best-protein-powders-muscle-growth',
        '<h1>Top 5 Protein Powders for Muscle Growth</h1><p>Building muscle requires quality protein supplementation...</p>',
        'Best Protein Powders 2024: Top 5 for Muscle Growth',
        'Compare the best protein powders for muscle growth. Lab-tested reviews, ingredient analysis, and expert recommendations.',
        'protein powder, muscle growth, supplements, fitness',
        '{"version": "3.18.0", "sections": [{"id": "hero", "type": "hero"}, {"id": "comparison", "type": "table"}]}'::jsonb,
        '["/vitamin-supplements", "/workout-nutrition"]'::jsonb,
        'optimized',
        'published',
        101,
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '7 days',
        NOW()
    ),
    (
        '880e8400-e29b-41d4-a716-446655440005',
        '660e8400-e29b-41d4-a716-446655440002',
        'Vitamin D Deficiency: Symptoms and Solutions',
        'vitamin-d-deficiency-symptoms',
        '<h1>Vitamin D Deficiency: Symptoms and Solutions</h1><p>Vitamin D is essential for bone health and immune function...</p>',
        'Vitamin D Deficiency: 10 Warning Signs & Solutions',
        'Learn about vitamin D deficiency symptoms, risks, and natural solutions. Expert advice on supplementation and sun exposure.',
        'vitamin d, deficiency, supplements, health',
        '{}'::jsonb,
        '["/best-protein-powders-muscle-growth"]'::jsonb,
        'published',
        'published',
        102,
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '1 day'
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TEST AGENT RUNS
-- ============================================================================

INSERT INTO agent_runs (
    id, project_id, agent_type, status, input, output, error_message,
    model_used, tokens_used, duration_ms, retry_count, created_at, updated_at, completed_at
)
VALUES 
    (
        '990e8400-e29b-41d4-a716-446655440001',
        '660e8400-e29b-41d4-a716-446655440001',
        'market_research',
        'completed',
        '{"niche": "SaaS SEO Tools", "target_audience": "Marketing teams"}'::jsonb,
        '{"market_size": "$50B", "trends": ["AI integration", "Voice search"], "opportunities": ["Small business market"]}'::jsonb,
        NULL,
        'gemini-1.5-pro',
        4500,
        8500,
        0,
        NOW() - INTERVAL '29 days',
        NOW() - INTERVAL '29 days',
        NOW() - INTERVAL '29 days' + INTERVAL '8.5 seconds'
    ),
    (
        '990e8400-e29b-41d4-a716-446655440002',
        '660e8400-e29b-41d4-a716-446655440001',
        'site_arch',
        'completed',
        '{"market_research_id": "990e8400-e29b-41d4-a716-446655440001"}'::jsonb,
        '{"site_structure": {"homepage": {"title": "Home"}}, "internal_link_strategy": {}}'::jsonb,
        NULL,
        'gemini-1.5-pro',
        3200,
        6200,
        0,
        NOW() - INTERVAL '28 days',
        NOW() - INTERVAL '28 days',
        NOW() - INTERVAL '28 days' + INTERVAL '6.2 seconds'
    ),
    (
        '990e8400-e29b-41d4-a716-446655440003',
        '660e8400-e29b-41d4-a716-446655440001',
        'content_builder',
        'completed',
        '{"page_title": "AI SEO Automation Guide", "target_keyword": "ai seo automation"}'::jsonb,
        '{"title": "The Ultimate Guide to AI SEO Automation", "word_count": 2500}'::jsonb,
        NULL,
        'gemini-1.5-pro',
        2800,
        4500,
        0,
        NOW() - INTERVAL '14 days',
        NOW() - INTERVAL '14 days',
        NOW() - INTERVAL '14 days' + INTERVAL '4.5 seconds'
    ),
    (
        '990e8400-e29b-41d4-a716-446655440004',
        '660e8400-e29b-41d4-a716-446655440001',
        'elementor_builder',
        'completed',
        '{"page_id": "880e8400-e29b-41d4-a716-446655440001"}'::jsonb,
        '{"widgets_used": ["heading", "text-editor", "image"], "sections": 5}'::jsonb,
        NULL,
        'gemini-1.5-pro',
        1500,
        3200,
        0,
        NOW() - INTERVAL '13 days',
        NOW() - INTERVAL '13 days',
        NOW() - INTERVAL '13 days' + INTERVAL '3.2 seconds'
    ),
    (
        '990e8400-e29b-41d4-a716-446655440005',
        '660e8400-e29b-41d4-a716-446655440001',
        'publisher',
        'completed',
        '{"page_id": "880e8400-e29b-41d4-a716-446655440001"}'::jsonb,
        '{"wordpress_post_id": 42, "url": "https://saas-seo-demo.com/ai-seo-automation-guide"}'::jsonb,
        NULL,
        NULL,
        0,
        2500,
        0,
        NOW() - INTERVAL '7 days',
        NOW() - INTERVAL '7 days',
        NOW() - INTERVAL '7 days' + INTERVAL '2.5 seconds'
    ),
    (
        '990e8400-e29b-41d4-a716-446655440006',
        '660e8400-e29b-41d4-a716-446655440001',
        'optimizer',
        'completed',
        '{"page_id": "880e8400-e29b-41d4-a716-446655440001", "gsc_data": []}'::jsonb,
        '{"recommendations": [{"type": "meta", "priority": "high"}]}'::jsonb,
        NULL,
        'gemini-1.5-pro',
        1800,
        2800,
        0,
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day' + INTERVAL '2.8 seconds'
    ),
    (
        '990e8400-e29b-41d4-a716-446655440007',
        '660e8400-e29b-41d4-a716-446655440002',
        'market_research',
        'completed',
        '{"niche": "Health Supplements", "target_audience": "Fitness enthusiasts"}'::jsonb,
        '{"market_size": "$150B", "trends": ["Plant-based proteins", "Personalized nutrition"]}'::jsonb,
        NULL,
        'gemini-1.5-pro',
        5200,
        9200,
        0,
        NOW() - INTERVAL '14 days',
        NOW() - INTERVAL '14 days',
        NOW() - INTERVAL '14 days' + INTERVAL '9.2 seconds'
    ),
    (
        '990e8400-e29b-41d4-a716-446655440008',
        '660e8400-e29b-41d4-a716-446655440002',
        'content_builder',
        'failed',
        '{"page_title": "Protein Powder Guide"}'::jsonb,
        '{}'::jsonb,
        'API rate limit exceeded. Retry after 60 seconds.',
        'gemini-1.5-pro',
        0,
        0,
        2,
        NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '10 days',
        NULL
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TEST GSC SNAPSHOTS
-- ============================================================================

INSERT INTO gsc_snapshots (
    id, project_id, query, page, clicks, impressions, ctr, position,
    snapshot_date, total_clicks, total_impressions, average_ctr, average_position,
    data, created_at
)
VALUES 
    -- Project 1 GSC data
    (
        'aa0e8400-e29b-41d4-a716-446655440001',
        '660e8400-e29b-41d4-a716-446655440001',
        'ai seo automation',
        'https://saas-seo-demo.com/ai-seo-automation-guide',
        145,
        2300,
        0.0630,
        3.2,
        CURRENT_DATE - INTERVAL '1 day',
        2450,
        45600,
        0.0537,
        4.1,
        '{"device": "desktop", "country": "us"}'::jsonb,
        NOW() - INTERVAL '1 day'
    ),
    (
        'aa0e8400-e29b-41d4-a716-446655440002',
        '660e8400-e29b-41d4-a716-446655440001',
        'seo automation tools',
        'https://saas-seo-demo.com/ai-seo-automation-guide',
        89,
        1200,
        0.0742,
        4.5,
        CURRENT_DATE - INTERVAL '1 day',
        2450,
        45600,
        0.0537,
        4.1,
        '{"device": "desktop", "country": "us"}'::jsonb,
        NOW() - INTERVAL '1 day'
    ),
    (
        'aa0e8400-e29b-41d4-a716-446655440003',
        '660e8400-e29b-41d4-a716-446655440001',
        'content optimization tools',
        'https://saas-seo-demo.com/best-content-optimization-tools',
        234,
        5600,
        0.0418,
        5.8,
        CURRENT_DATE - INTERVAL '1 day',
        2450,
        45600,
        0.0537,
        4.1,
        '{"device": "mobile", "country": "us"}'::jsonb,
        NOW() - INTERVAL '1 day'
    ),
    -- Historical data for comparison
    (
        'aa0e8400-e29b-41d4-a716-446655440004',
        '660e8400-e29b-41d4-a716-446655440001',
        'ai seo automation',
        'https://saas-seo-demo.com/ai-seo-automation-guide',
        120,
        2100,
        0.0571,
        3.8,
        CURRENT_DATE - INTERVAL '8 days',
        2100,
        41200,
        0.0510,
        4.5,
        '{"device": "desktop", "country": "us"}'::jsonb,
        NOW() - INTERVAL '8 days'
    ),
    -- Project 2 GSC data
    (
        'aa0e8400-e29b-41d4-a716-446655440005',
        '660e8400-e29b-41d4-a716-446655440002',
        'best protein powder',
        'https://healthsupplements-demo.com/best-protein-powders-muscle-growth',
        567,
        12500,
        0.0454,
        6.2,
        CURRENT_DATE - INTERVAL '1 day',
        1890,
        38900,
        0.0486,
        7.3,
        '{"device": "mobile", "country": "us"}'::jsonb,
        NOW() - INTERVAL '1 day'
    ),
    (
        'aa0e8400-e29b-41d4-a716-446655440006',
        '660e8400-e29b-41d4-a716-446655440002',
        'vitamin d deficiency',
        'https://healthsupplements-demo.com/vitamin-d-deficiency-symptoms',
        892,
        8900,
        0.1002,
        2.1,
        CURRENT_DATE - INTERVAL '1 day',
        1890,
        38900,
        0.0486,
        7.3,
        '{"device": "mobile", "country": "us"}'::jsonb,
        NOW() - INTERVAL '1 day'
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TEST RANKINGS
-- ============================================================================

INSERT INTO rankings (
    id, project_id, page_id, keyword, position, previous_position, position_change,
    url, search_volume, difficulty, tracked_at, created_at
)
VALUES 
    (
        'bb0e8400-e29b-41d4-a716-446655440001',
        '660e8400-e29b-41d4-a716-446655440001',
        '880e8400-e29b-41d4-a716-446655440001',
        'ai seo automation',
        3,
        5,
        2,
        'https://saas-seo-demo.com/ai-seo-automation-guide',
        2400,
        45,
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
    ),
    (
        'bb0e8400-e29b-41d4-a716-446655440002',
        '660e8400-e29b-41d4-a716-446655440001',
        '880e8400-e29b-41d4-a716-446655440001',
        'seo automation',
        5,
        7,
        2,
        'https://saas-seo-demo.com/ai-seo-automation-guide',
        5800,
        52,
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
    ),
    (
        'bb0e8400-e29b-41d4-a716-446655440003',
        '660e8400-e29b-41d4-a716-446655440001',
        '880e8400-e29b-41d4-a716-446655440002',
        'content optimization tools',
        8,
        12,
        4,
        'https://saas-seo-demo.com/best-content-optimization-tools',
        1900,
        38,
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
    ),
    (
        'bb0e8400-e29b-41d4-a716-446655440004',
        '660e8400-e29b-41d4-a716-446655440002',
        '880e8400-e29b-41d4-a716-446655440004',
        'best protein powder',
        6,
        9,
        3,
        'https://healthsupplements-demo.com/best-protein-powders-muscle-growth',
       45000,
        67,
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
    ),
    (
        'bb0e8400-e29b-41d4-a716-446655440005',
        '660e8400-e29b-41d4-a716-446655440002',
        '880e8400-e29b-41d4-a716-446655440005',
        'vitamin d deficiency symptoms',
        2,
        2,
        0,
        'https://healthsupplements-demo.com/vitamin-d-deficiency-symptoms',
       14800,
        34,
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TEST LEADS
-- ============================================================================

INSERT INTO leads (
    id, project_id, email, phone, name, message, source_page_id, source_url,
    data, captured_at, created_at
)
VALUES 
    (
        'cc0e8400-e29b-41d4-a716-446655440001',
        '660e8400-e29b-41d4-a716-446655440001',
        'john.doe@company.com',
        '+1-555-0123',
        'John Doe',
        'I am interested in learning more about your AI SEO automation tools for our marketing team.',
        '880e8400-e29b-41d4-a716-446655440001',
        'https://saas-seo-demo.com/ai-seo-automation-guide',
        '{"form_id": "contact-form-1", "utm_source": "google", "utm_medium": "organic"}'::jsonb,
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '3 days'
    ),
    (
        'cc0e8400-e29b-41d4-a716-446655440002',
        '660e8400-e29b-41d4-a716-446655440001',
        'sarah.smith@agency.com',
        NULL,
        'Sarah Smith',
        'Looking for a demo of your content optimization features.',
        '880e8400-e29b-41d4-a716-446655440002',
        'https://saas-seo-demo.com/best-content-optimization-tools',
        '{"form_id": "demo-request", "company_size": "50-100"}'::jsonb,
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '2 days'
    ),
    (
        'cc0e8400-e29b-41d4-a716-446655440003',
        '660e8400-e29b-41d4-a716-446655440002',
        'mike.athlete@gym.com',
        '+1-555-0456',
        'Mike Johnson',
        'Which protein powder do you recommend for post-workout recovery?',
        '880e8400-e29b-41d4-a716-446655440004',
        'https://healthsupplements-demo.com/best-protein-powders-muscle-growth',
        '{"form_id": "product-question", "fitness_goal": "muscle_gain"}'::jsonb,
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
    ),
    (
        'cc0e8400-e29b-41d4-a716-446655440004',
        '660e8400-e29b-41d4-a716-446655440002',
        'health.conscious@email.com',
        NULL,
        'Emily Chen',
        'I have been experiencing fatigue. Could this be related to vitamin D deficiency?',
        '880e8400-e29b-41d4-a716-446655440005',
        'https://healthsupplements-demo.com/vitamin-d-deficiency-symptoms',
        '{"form_id": "health-consultation"}'::jsonb,
        NOW() - INTERVAL '12 hours',
        NOW() - INTERVAL '12 hours'
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TEST LOGS
-- ============================================================================

INSERT INTO logs (id, project_id, agent_run_id, level, service, message, metadata, created_at)
VALUES 
    (
        'dd0e8400-e29b-41d4-a716-446655440001',
        '660e8400-e29b-41d4-a716-446655440001',
        '990e8400-e29b-41d4-a716-446655440001',
        'info',
        'market_research_agent',
        'Market research completed successfully',
        '{"keywords_found": 150, "competitors_analyzed": 5}'::jsonb,
        NOW() - INTERVAL '29 days'
    ),
    (
        'dd0e8400-e29b-41d4-a716-446655440002',
        '660e8400-e29b-41d4-a716-446655440001',
        '990e8400-e29b-41d4-a716-446655440003',
        'info',
        'content_builder_agent',
        'Content generation completed',
        '{"word_count": 2500, "readability_score": 72}'::jsonb,
        NOW() - INTERVAL '14 days'
    ),
    (
        'dd0e8400-e29b-41d4-a716-446655440003',
        '660e8400-e29b-41d4-a716-446655440001',
        '990e8400-e29b-41d4-a716-446655440005',
        'warn',
        'publisher_agent',
        'WordPress API responded slowly',
        '{"response_time_ms": 8500, "retry_count": 1}'::jsonb,
        NOW() - INTERVAL '7 days'
    ),
    (
        'dd0e8400-e29b-41d4-a716-446655440004',
        '660e8400-e29b-41d4-a716-446655440002',
        '990e8400-e29b-41d4-a716-446655440008',
        'error',
        'content_builder_agent',
        'API rate limit exceeded',
        '{"error_code": "RATE_LIMIT", "retry_after": 60}'::jsonb,
        NOW() - INTERVAL '10 days'
    ),
    (
        'dd0e8400-e29b-41d4-a716-446655440005',
        '660e8400-e29b-41d4-a716-446655440002',
        NULL,
        'info',
        'monitor_service',
        'GSC sync completed',
        '{"queries_synced": 150, "pages_synced": 25}'::jsonb,
        NOW() - INTERVAL '1 day'
    ),
    (
        'dd0e8400-e29b-41d4-a716-446655440006',
        NULL,
        NULL,
        'debug',
        'system',
        'Database connection pool status',
        '{"active_connections": 5, "idle_connections": 10}'::jsonb,
        NOW() - INTERVAL '1 hour'
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Display summary of seeded data
SELECT 
    'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Projects', COUNT(*) FROM projects
UNION ALL
SELECT 'Integrations', COUNT(*) FROM integrations
UNION ALL
SELECT 'Pages', COUNT(*) FROM pages
UNION ALL
SELECT 'Agent Runs', COUNT(*) FROM agent_runs
UNION ALL
SELECT 'GSC Snapshots', COUNT(*) FROM gsc_snapshots
UNION ALL
SELECT 'Rankings', COUNT(*) FROM rankings
UNION ALL
SELECT 'Leads', COUNT(*) FROM leads
UNION ALL
SELECT 'Logs', COUNT(*) FROM logs
ORDER BY table_name;
