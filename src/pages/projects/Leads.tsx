import { useState } from "react";
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
  Download, 
  MoreVertical, 
  Edit, 
  Eye, 
  Trash2, 
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  Users,
  TrendingUp,
  MessageSquare,
  CheckCircle,
  Clock,
  Star
} from "lucide-react";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  sourcePage: string;
  sourcePageUrl: string;
  capturedDate: string;
  status: "not_contacted" | "contacted" | "converted";
  message?: string;
  location?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  tags: string[];
  assignedTo?: string;
  notes?: string;
  lastContactDate?: string;
  conversionValue?: number;
}

const mockLeads: Lead[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    phone: "+1 (555) 123-4567",
    sourcePage: "Ultimate Guide to Urban Gardening",
    sourcePageUrl: "/urban-gardening-guide",
    capturedDate: "2024-01-15T10:30:00Z",
    status: "converted",
    message: "I'm interested in starting an urban garden on my apartment balcony. Looking for expert advice and product recommendations.",
    location: "New York, NY",
    utmSource: "google",
    utmMedium: "organic",
    utmCampaign: "urban_gardening",
    tags: ["hot_lead", "apartment", "balcony"],
    assignedTo: "John Smith",
    notes: "Very interested customer. Follow up with product catalog.",
    lastContactDate: "2024-01-16T14:00:00Z",
    conversionValue: 299.99
  },
  {
    id: "2",
    name: "Mike Chen",
    email: "mike.chen@email.com",
    sourcePage: "Balcony Composting Guide",
    sourcePageUrl: "/balcony-composting-guide",
    capturedDate: "2024-01-14T15:45:00Z",
    status: "contacted",
    message: "Need help setting up a composting system for my small balcony space.",
    location: "San Francisco, CA",
    utmSource: "facebook",
    utmMedium: "social",
    utmCampaign: "composting_content",
    tags: ["medium_priority", "balcony", "composting"],
    assignedTo: "Jane Doe",
    notes: "Sent initial email with basic setup guide.",
    lastContactDate: "2024-01-15T09:30:00Z"
  },
  {
    id: "3",
    name: "Emma Rodriguez",
    email: "emma.rodriguez@email.com",
    phone: "+1 (555) 987-6543",
    sourcePage: "Best Vegetables for Container Gardens",
    sourcePageUrl: "/container-gardening-tips",
    capturedDate: "2024-01-13T11:20:00Z",
    status: "not_contacted",
    message: "I have a rooftop space and want to grow vegetables. What are the best options?",
    location: "Chicago, IL",
    utmSource: "pinterest",
    utmMedium: "social",
    utmCampaign: "vegetable_gardening",
    tags: ["new_lead", "rooftop", "vegetables"],
    assignedTo: "John Smith",
    notes: "New lead - priority follow-up needed."
  },
  {
    id: "4",
    name: "David Wilson",
    email: "david.wilson@email.com",
    sourcePage: "Indoor Herb Garden Setup",
    sourcePageUrl: "/indoor-herb-garden-setup",
    capturedDate: "2024-01-12T16:10:00Z",
    status: "contacted",
    message: "Interested in starting an indoor herb garden in my kitchen. Looking for beginner advice.",
    location: "Austin, TX",
    utmSource: "google",
    utmMedium: "organic",
    utmCampaign: "herb_gardening",
    tags: ["beginner", "indoor", "herbs"],
    assignedTo: "Jane Doe",
    notes: "Provided beginner's guide PDF."
  },
  {
    id: "5",
    name: "Lisa Thompson",
    email: "lisa.thompson@email.com",
    phone: "+1 (555) 456-7890",
    sourcePage: "Vertical Gardening Ideas",
    sourcePageUrl: "/vertical-gardening-ideas",
    capturedDate: "2024-01-11T13:25:00Z",
    status: "converted",
    message: "I have limited ground space but lots of wall space. Vertical gardening seems perfect for me!",
    location: "Seattle, WA",
    utmSource: "instagram",
    utmMedium: "social",
    utmCampaign: "vertical_gardening",
    tags: ["converted", "vertical", "wall_space"],
    assignedTo: "John Smith",
    notes: "Purchased vertical garden kit. Very satisfied customer.",
    lastContactDate: "2024-01-14T16:45:00Z",
    conversionValue: 189.99
  },
  {
    id: "6",
    name: "Robert Garcia",
    email: "robert.garcia@email.com",
    sourcePage: "Small Space Gardening",
    sourcePageUrl: "/small-space-gardening",
    capturedDate: "2024-01-10T09:15:00Z",
    status: "not_contacted",
    message: "Living in a studio apartment. What are my options for growing plants?",
    location: "Miami, FL",
    utmSource: "google",
    utmMedium: "organic",
    utmCampaign: "small_space",
    tags: ["studio", "limited_space", "plants"],
    assignedTo: "Jane Doe",
    notes: "High priority - studio apartment dweller."
  }
];

const statusColors = {
  not_contacted: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  contacted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  converted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
};

const statusIcons = {
  not_contacted: <Clock className="h-3 w-3" />,
  contacted: <MessageSquare className="h-3 w-3" />,
  converted: <CheckCircle className="h-3 w-3" />
};

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const filteredLeads = leads
    .filter(lead => {
      const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           lead.sourcePage.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.capturedDate).getTime() - new Date(a.capturedDate).getTime();
        case "oldest":
          return new Date(a.capturedDate).getTime() - new Date(b.capturedDate).getTime();
        case "name":
          return a.name.localeCompare(b.name);
        case "status":
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

  const getStatusBadge = (status: string) => {
    const classes = statusColors[status as keyof typeof statusColors];
    const icon = statusIcons[status as keyof typeof statusIcons];
    return (
      <Badge className={`text-xs ${classes} flex items-center gap-1`}>
        {icon}
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  const getLeadStatistics = () => {
    const total = leads.length;
    const contacted = leads.filter(l => l.status === 'contacted').length;
    const converted = leads.filter(l => l.status === 'converted').length;
    const thisMonth = leads.filter(l => {
      const leadDate = new Date(l.capturedDate);
      const now = new Date();
      return leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear();
    }).length;
    const thisWeek = leads.filter(l => {
      const leadDate = new Date(l.capturedDate);
      const now = new Date();
      const diffInDays = Math.floor((now.getTime() - leadDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffInDays <= 7;
    }).length;
    const conversionRate = total > 0 ? (converted / total) * 100 : 0;
    
    return { total, contacted, converted, thisMonth, thisWeek, conversionRate };
  };

  const getTotalConversionValue = () => {
    return leads
      .filter(l => l.status === 'converted' && l.conversionValue)
      .reduce((sum, l) => sum + (l.conversionValue || 0), 0);
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    const newSelected = new Set(selectedLeads);
    if (checked) {
      newSelected.add(leadId);
    } else {
      newSelected.delete(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(new Set(filteredLeads.map(l => l.id)));
    } else {
      setSelectedLeads(new Set());
    }
  };

  const handleDeleteLead = (leadId: string) => {
    setLeadToDelete(leadId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (leadToDelete) {
      setLeads(leads.filter(l => l.id !== leadToDelete));
      setSelectedLeads(prev => {
        const newSet = new Set(prev);
        newSet.delete(leadToDelete);
        return newSet;
      });
    }
    setShowDeleteDialog(false);
    setLeadToDelete(null);
  };

  const handleStatusChange = (leadId: string, newStatus: string) => {
    setLeads(leads.map(l => 
      l.id === leadId 
        ? { ...l, status: newStatus as any, lastContactDate: new Date().toISOString() }
        : l
    ));
  };

  const handleBulkAction = (action: string) => {
    if (selectedLeads.size === 0) return;

    switch (action) {
      case "contacted":
        setLeads(leads.map(l => 
          selectedLeads.has(l.id) ? { ...l, status: 'contacted' as const } : l
        ));
        break;
      case "converted":
        setLeads(leads.map(l => 
          selectedLeads.has(l.id) ? { ...l, status: 'converted' as const } : l
        ));
        break;
      case "export":
        // Handle bulk export
        console.log("Exporting leads:", Array.from(selectedLeads));
        break;
      case "delete":
        setLeads(leads.filter(l => !selectedLeads.has(l.id)));
        setSelectedLeads(new Set());
        break;
    }
  };

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead);
    setShowLeadDetail(true);
  };

  const stats = getLeadStatistics();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leads Manager</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage leads captured from your content
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button className="gap-2">
            <User className="h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Lead Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Total Captured</span>
            </div>
            <div className="text-2xl font-semibold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">
              {stats.thisWeek} this week • {stats.thisMonth} this month
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">Contacted</span>
            </div>
            <div className="text-2xl font-semibold">{stats.contacted}</div>
            <div className="text-xs text-muted-foreground">
              {((stats.contacted / stats.total) * 100).toFixed(1)}% of total
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Converted</span>
            </div>
            <div className="text-2xl font-semibold">{stats.converted}</div>
            <div className="text-xs text-muted-foreground">
              {stats.conversionRate.toFixed(1)}% conversion rate
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Revenue</span>
            </div>
            <div className="text-2xl font-semibold">${getTotalConversionValue().toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">
              From converted leads
            </div>
          </CardContent>
        </Card>
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
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                    All Status
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("not_contacted")}>
                    Not Contacted
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("contacted")}>
                    Contacted
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("converted")}>
                    Converted
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sort */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
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
                  <DropdownMenuItem onClick={() => setSortBy("name")}>
                    Name A-Z
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("status")}>
                    Status
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Bulk Actions */}
            {selectedLeads.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedLeads.size} selected
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Bulk Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkAction("contacted")}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Mark as Contacted
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("converted")}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Converted
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleBulkAction("export")}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Selected
                    </DropdownMenuItem>
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

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Leads ({filteredLeads.length})</span>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
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
                  <th className="text-left p-4 font-medium">Lead</th>
                  <th className="text-left p-4 font-medium">Contact</th>
                  <th className="text-left p-4 font-medium">Source</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Captured</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <Checkbox
                        checked={selectedLeads.has(lead.id)}
                        onCheckedChange={(checked) => 
                          handleSelectLead(lead.id, checked as boolean)
                        }
                      />
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="font-medium">{lead.name}</div>
                        {lead.location && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {lead.location}
                          </div>
                        )}
                        {lead.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {lead.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {lead.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{lead.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </div>
                        {lead.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{lead.sourcePage}</div>
                        <div className="text-xs text-muted-foreground">
                          {lead.utmSource && (
                            <span>{lead.utmSource} • {lead.utmMedium}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(lead.status)}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatRelativeTime(lead.capturedDate)}
                      </div>
                      <div className="text-xs">
                        {formatDate(lead.capturedDate)}
                      </div>
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewLead(lead)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(lead.id, 'contacted')}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Mark as Contacted
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(lead.id, 'converted')}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark as Converted
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteLead(lead.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Lead Detail Modal */}
      <Dialog open={showLeadDetail} onOpenChange={setShowLeadDetail}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-6">
              {/* Lead Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-sm">{selectedLead.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm">{selectedLead.email}</p>
                </div>
                {selectedLead.phone && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p className="text-sm">{selectedLead.phone}</p>
                  </div>
                )}
                {selectedLead.location && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Location</label>
                    <p className="text-sm">{selectedLead.location}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Source Page</label>
                  <p className="text-sm">{selectedLead.sourcePage}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Captured Date</label>
                  <p className="text-sm">{formatDate(selectedLead.capturedDate)}</p>
                </div>
              </div>

              {/* Message */}
              {selectedLead.message && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Message</label>
                  <p className="text-sm bg-muted p-3 rounded mt-1">{selectedLead.message}</p>
                </div>
              )}

              {/* Status and Actions */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedLead.status)}</div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleStatusChange(selectedLead.id, 'contacted')}
                  >
                    Mark as Contacted
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleStatusChange(selectedLead.id, 'converted')}
                  >
                    Mark as Converted
                  </Button>
                </div>
              </div>

              {/* Tags */}
              {selectedLead.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tags</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedLead.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* UTM Data */}
              {selectedLead.utmSource && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Traffic Source</label>
                  <p className="text-sm">
                    {selectedLead.utmSource} → {selectedLead.utmMedium} → {selectedLead.utmCampaign}
                  </p>
                </div>
              )}

              {/* Conversion Value */}
              {selectedLead.conversionValue && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Conversion Value</label>
                  <p className="text-sm font-semibold text-green-600">
                    ${selectedLead.conversionValue.toFixed(2)}
                  </p>
                </div>
              )}

              {/* Notes */}
              {selectedLead.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Notes</label>
                  <p className="text-sm bg-muted p-3 rounded mt-1">{selectedLead.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lead</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this lead? This action cannot be undone.
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
    </div>
  );
}