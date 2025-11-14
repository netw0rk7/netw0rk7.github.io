<script>
  import I18nKey from "../i18n/i18nKey";
  import { i18n } from "../i18n/translation";
  import { getPostUrlBySlug } from "../utils/url-utils";

  // props ที่ page ด้านนอกส่งมา
  export let tags = [];
  export let categories = [];
  export let sortedPosts = [];

  // group posts ตามปี
  let groups = [];

  function buildGroups(posts) {
    const grouped = posts.reduce((acc, post) => {
      const d = new Date(post.data.published);
      const year = d.getFullYear();
      if (!acc[year]) acc[year] = [];
      acc[year].push(post);
      return acc;
    }, {});

    const groupedPostsArray = Object.keys(grouped).map((yearStr) => ({
      year: parseInt(yearStr, 10),
      posts: grouped[parseInt(yearStr, 10)],
    }));

    // ปีใหม่อยู่บน
    groupedPostsArray.sort((a, b) => b.year - a.year);
    return groupedPostsArray;
  }

  // ให้ Svelte คำนวณ groups จาก sortedPosts
  $: groups = buildGroups(sortedPosts || []);

  function formatDate(published) {
    const d = new Date(published);
    if (Number.isNaN(d.getTime())) return "";
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${month}-${day}`;
  }

  function formatTag(tagList = []) {
    return tagList.map((t) => `#${t}`).join(" ");
  }
</script>

<div class="card-base px-8 py-6">
  {#each groups as group}
    <div>
      <div class="flex flex-row w-full items-center h-[3.75rem]">
        <div
          class="w-[15%] md:w-[10%] transition text-2xl font-bold text-right text-75"
        >
          {group.year}
        </div>
        <div class="w-[15%] md:w-[10%]">
          <div
            class="h-3 w-3 bg-none rounded-full outline outline-[var(--primary)] mx-auto
              -outline-offset-[2px] z-50 outline-3"
          ></div>
        </div>
        <div class="w-[70%] md:w-[80%] transition text-left text-50">
          {group.posts.length}
          {i18n(
            group.posts.length === 1
              ? I18nKey.postCount
              : I18nKey.postsCount,
          )}
        </div>
      </div>

      {#each group.posts as post}
        <a
          href={getPostUrlBySlug(post.slug)}
          aria-label={post.data.title}
          class="group btn-plain !block h-10 w-full rounded-lg hover:text-[initial]"
        >
          <div class="flex flex-row justify-start items-center h-full">
            <!-- date -->
            <div
              class="w-[15%] md:w-[10%] transition text-sm text-right text-50"
            >
              {formatDate(post.data.published)}
            </div>

            <!-- dot and line -->
            <div
              class="w-[15%] md:w-[10%] relative dash-line h-full flex items-center"
            >
              <div
                class="transition-all mx-auto w-1 h-1 rounded group-hover:h-5
                  bg-[oklch(0.5_0.05_var(--hue))] group-hover:bg-[var(--primary)]
                  outline outline-4 z-50
                  outline-[var(--card-bg)]
                  group-hover:outline-[var(--btn-plain-bg-hover)]
                  group-active:outline-[var(--btn-plain-bg-active)]"
              ></div>
            </div>

            <!-- post title -->
            <div
              class="w-[70%] md:max-w-[65%] md:w-[65%] text-left font-bold
                group-hover:translate-x-1 transition-all group-hover:text-[var(--primary)]
                text-75 pr-8 whitespace-nowrap overflow-ellipsis overflow-hidden"
            >
              {post.data.title}
            </div>

            <!-- tag list -->
            <div
              class="hidden md:block md:w-[15%] text-left text-sm transition
                whitespace-nowrap overflow-ellipsis overflow-hidden text-30"
            >
              {formatTag(post.data.tags)}
            </div>
          </div>
        </a>
      {/each}
    </div>
  {/each}
</div>
