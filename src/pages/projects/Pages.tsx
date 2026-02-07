import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
  Download,
  ArrowUpDown,
  FileText,
  Globe
} from "lucide-react";
import { pagesService, type PageFromApi } from "@/services/pages";
import { projectsService } from "@/services/projects";
import { PageEditor } from "@/components/PageEditor";
import { formatDistanceToNow } from "date-fns";
import { useNotification } from "@/hooks/useNotification";

/** Normalize project domain to WordPress base URL (e.g. https://example.com) */
function toWordPressBaseUrl(domain: string | undefined | null): string | null {
  const raw = (domain ?? "").toString().trim();
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/+$/, "");
  }
  return `https://${raw.replace(/^\/+|\/+$/g, "")}`;
}

interface Page {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "optimized";
  published: boolean;
  publishedDate?: string;
  wordpressId?: number;
  lastModified: string;
  metaTitle?: string;
  metaDescription?: string;
  wordCount?: number;
  keywords: string[];
}

function mapPage(p: PageFromApi): Page {
  const published = !!p.published_at;
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    status: (p.status as Page["status"]) || "draft",
    published,
    publishedDate: p.published_at ? p.published_at.slice(0, 10) : undefined,
    wordpressId: p.wordpress_post_id ?? undefined,
    lastModified: formatDistanceToNow(new Date(p.updated_at), { addSuffix: true }),
    metaTitle: p.meta_title ?? undefined,
    metaDescription: p.meta_description ?? undefined,
    wordCount: p.content ? p.content.split(/\s+/).length : 0,
    keywords: [],
  };
}

const statusColors = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  published: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  optimized: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
};

export default function Pages() {
  const { projectId } = useParams<{ projectId: string }>();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pagesPerPage = 20;
  const [wordpressBaseUrl, setWordpressBaseUrl] = useState<string | null>(null);
  const { showError } = useNotification();

  // Page Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<PageFromApi | null>(null);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    projectsService
      .get(projectId)
      .then((p) => {
        if (!cancelled) setWordpressBaseUrl(toWordPressBaseUrl(p.domain));
      })
      .catch(() => {
        if (!cancelled) setWordpressBaseUrl(null);
      });
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    pagesService
      .list(projectId, { limit: 200, sort: "updated_at" })
      .then((res) => {
        if (!cancelled) setPages(res.pages.map(mapPage));
      })
      .catch((err) => {
        if (!cancelled) showError(err instanceof Error ? err.message : "Failed to load pages");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [projectId, showError]);

  const filteredPages = pages
    .filter(page => {
      const matchesSearch = page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           page.slug.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || page.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
        case "oldest":
          return new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
        case "title-a":
          return a.title.localeCompare(b.title);
        case "title-z":
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

  const paginatedPages = filteredPages.slice(
    (currentPage - 1) * pagesPerPage,
    currentPage * pagesPerPage
  );

  const totalPages = Math.ceil(filteredPages.length / pagesPerPage);

  const handleSelectPage = (pageId: string, checked: boolean) => {
    const newSelected = new Set(selectedPages);
    if (checked) {
      newSelected.add(pageId);
    } else {
      newSelected.delete(pageId);
    }
    setSelectedPages(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPages(new Set(paginatedPages.map(p => p.id)));
    } else {
      setSelectedPages(new Set());
    }
  };

  const handleDeletePage = (pageId: string) => {
    setPageToDelete(pageId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!pageToDelete || !projectId) {
      setShowDeleteDialog(false);
      setPageToDelete(null);
      return;
    }
    try {
      await pagesService.delete(projectId, pageToDelete);
      setPages(pages.filter((p) => p.id !== pageToDelete));
      setSelectedPages((prev) => {
        const newSet = new Set(prev);
        newSet.delete(pageToDelete);
        return newSet;
      });
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to delete page");
    }
    setShowDeleteDialog(false);
    setPageToDelete(null);
  };

  const handleBulkAction = (action: string) => {
    if (selectedPages.size === 0) return;

    switch (action) {
      case "delete":
        // Handle bulk delete
        console.log("Deleting pages:", Array.from(selectedPages));
        break;
      case "export":
        // Handle bulk export
        console.log("Exporting pages:", Array.from(selectedPages));
        break;
      default:
        console.log("Unknown action:", action);
    }
  };

  const handleCreatePage = () => {
    setEditingPage(null);
    setEditorMode("create");
    setIsEditorOpen(true);
  };

  const handleEditPage = (pageId: string) => {
    const page = pages.find((p) => p.id === pageId);
    if (page) {
      const fullPage: PageFromApi = {
        id: page.id,
        title: page.title,
        slug: page.slug,
        status: page.status,
        content: "", // Will be fetched when needed
        meta_title: page.metaTitle,
        meta_description: page.metaDescription,
        meta_keywords: undefined,
        published_at: page.publishedDate,
        wordpress_post_id: page.wordpressId,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        elementor_data: undefined,
      };
      setEditingPage(fullPage);
      setEditorMode("edit");
      setIsEditorOpen(true);
    }
  };

  const handlePageSaved = (savedPage: PageFromApi) => {
    // Refresh the page list
    if (projectId) {
      pagesService
        .list(projectId, { limit: 200, sort: "updated_at" })
        .then((res) => {
          setPages(res.pages.map(mapPage));
        })
        .catch((err) => {
          showError(err instanceof Error ? err.message : "Failed to refresh pages");
        });
    }
  };

  const getStatusBadge = (status: string) => {
    const classes = statusColors[status as keyof typeof statusColors];
    return (
      <Badge className={`text-xs ${classes}`}>
        {status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pages Manager</h1>
          <p className="text-sm text-muted-foreground">
            Manage your published content and track performance
          </p>
        </div>
        <Button className="gap-2" onClick={handleCreatePage}>
          <Plus className="h-4 w-4" />
          Create Page
        </Button>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                    All Status
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("draft")}>
                    Draft
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("published")}>
                    Published
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("optimized")}>
                    Optimized
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sort */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSortBy("newest")}>
                    Newest First
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("oldest")}>
                    Oldest First
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("title-a")}>
                    Title A-Z
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("title-z")}>
                    Title Z-A
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Bulk Actions */}
            {selectedPages.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedPages.size} selected
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Bulk Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkAction("export")}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Selected
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleBulkAction("delete")}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pages Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pages ({loading ? "…" : filteredPages.length})</span>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedPages.size === paginatedPages.length && paginatedPages.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">Select All</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Select</th>
                  <th className="text-left p-4 font-medium">Title</th>
                  <th className="text-left p-4 font-medium">Slug</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Published</th>
                  <th className="text-left p-4 font-medium">Last Modified</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      Loading pages…
                    </td>
                  </tr>
                ) : paginatedPages.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No pages yet.
                    </td>
                  </tr>
                ) : (
                paginatedPages.map((page) => (
                  <tr key={page.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <Checkbox
                        checked={selectedPages.has(page.id)}
                        onCheckedChange={(checked) => 
                          handleSelectPage(page.id, checked as boolean)
                        }
                      />
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="font-medium">{page.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {page.wordCount?.toLocaleString()} words
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        /{page.slug}
                      </code>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(page.status)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {page.published ? (
                          <>
                            <Globe className="h-4 w-4 text-green-600" />
                            <span className="text-sm">Yes</span>
                            {page.publishedDate && (
                              <span className="text-xs text-muted-foreground">
                                ({formatDate(page.publishedDate)})
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">No</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {page.lastModified}
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditPage(page.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {page.published && page.wordpressId && wordpressBaseUrl && (
                            <>
                              <DropdownMenuItem asChild>
                                <a
                                  href={`${wordpressBaseUrl}/${page.slug.replace(/^\/+|\/+$/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Globe className="h-4 w-4 mr-2" />
                                  View in WordPress
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a
                                  href={`${wordpressBaseUrl}/wp-admin/post.php?post=${page.wordpressId}&action=edit`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Edit in WordPress
                                </a>
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem onClick={() => handleDeletePage(page.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pagesPerPage + 1} to{' '}
                {Math.min(currentPage * pagesPerPage, filteredPages.length)} of{' '}
                {filteredPages.length} pages
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Page</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this page? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Page Editor */}
      <PageEditor
        projectId={projectId || ""}
        page={editingPage}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handlePageSaved}
        mode={editorMode}
      />
    </div>
  );
}