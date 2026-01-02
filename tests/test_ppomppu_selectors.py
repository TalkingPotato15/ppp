"""Quick test to verify Ppomppu CSS selectors work correctly."""

import asyncio
from src.agents.analyst.scraper import ForumScraper
from src.config.settings import settings


async def test_selectors():
    """Test if the Ppomppu selectors can extract data correctly."""

    print("="*80)
    print("TESTING PPOMPPU SELECTORS")
    print("="*80)
    print(f"\nTarget URL: {settings.target_forum_url}")
    print(f"Forum Name: {settings.target_forum_name}\n")

    scraper = ForumScraper(forum_name=settings.target_forum_name)

    try:
        # Test 1: Fetch list page
        print("📋 TEST 1: Fetching post list page...")
        post_list = await scraper.scrape_post_list(settings.target_forum_url)

        if not post_list:
            print("❌ FAILED: No posts found on list page")
            print("   The selectors might be incorrect.")
            print("   Please check the HTML structure in your browser DevTools.")
            return False

        print(f"✅ SUCCESS: Found {len(post_list)} posts on list page")

        # Show sample posts
        print("\n📄 Sample Posts Found:")
        for i, post_info in enumerate(post_list[:3], 1):
            print(f"\n  {i}. Title: {post_info.get('title', 'N/A')[:60]}...")
            print(f"     URL: {post_info.get('url', 'N/A')[:80]}...")
            print(f"     Date: {post_info.get('date_str', 'N/A')}")

        # Test 2: Fetch a single post detail
        if post_list:
            print("\n" + "="*80)
            print("📖 TEST 2: Fetching post detail page...")

            test_url = post_list[0]['url']
            print(f"   Testing URL: {test_url[:80]}...")

            post = await scraper.scrape_post(test_url)

            if not post:
                print("❌ FAILED: Could not extract post content")
                print("   The 'post_content' selector might be incorrect.")
                print("   Please inspect the post detail page structure.")
                return False

            print(f"✅ SUCCESS: Post content extracted")
            print(f"\n📄 Sample Post Details:")
            print(f"   URL: {post.source_url[:80]}...")
            print(f"   Content length: {len(post.content)} characters")
            print(f"   Content preview: {post.content[:200]}...")
            print(f"   Author: {post.author or 'N/A'}")
            print(f"   Posted at: {post.posted_at}")

        print("\n" + "="*80)
        print("✅ ALL TESTS PASSED!")
        print("="*80)
        print("\n💡 The selectors are working correctly.")
        print("   You can now run: uv run python -m src.main initial-load --months 1 --max-posts 10")

        return True

    except Exception as e:
        print("\n" + "="*80)
        print("❌ TEST FAILED WITH ERROR")
        print("="*80)
        print(f"\nError: {e}")
        print("\n📝 Troubleshooting:")
        print("   1. Open the forum URL in your browser")
        print("   2. Press F12 to open DevTools")
        print("   3. Inspect the HTML structure")
        print("   4. Update the selectors in src/config/selectors.py")
        return False

    finally:
        await scraper.close()


if __name__ == "__main__":
    success = asyncio.run(test_selectors())
    exit(0 if success else 1)
