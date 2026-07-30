import React, { useState, useEffect } from "react";
import { 
  UserCheck, 
  Search, 
  Loader2, 
  Mail, 
  Calendar, 
  Shield, 
  Ban, 
  CheckCircle,
  UserMinus
} from "lucide-react";

import PageHeader from "@/components/PageHeader";
import GoldButton from "@/components/GoldButton";
import EmptyState from "@/components/EmptyState";
import StatusBadge from "@/components/StatusBadge";
import { SkeletonCard } from "@/components/Skeletons";
import { useToast } from "@/components/ui/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  listUsersByStatus, 
  approveUser, 
  rejectUser, 
  deactivateUser, 
  changeUserRole 
} from "@/api/supabaseData";

export default function Users() {
  const [activeUsers, setActiveUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [rejectedUsers, setRejectedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  // Modals state
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("receptionist");
  const [actionType, setActionType] = useState("approve"); // 'approve' | 'change_role'
  
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);

  // Fetch users by status
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const active = await listUsersByStatus("active");
      const suspended = await listUsersByStatus("suspended");
      const pending = await listUsersByStatus("pending");
      const rejected = await listUsersByStatus("rejected");

      // Group active and suspended together under "Active Users"
      setActiveUsers([...active, ...suspended]);
      setPendingUsers(pending);
      setRejectedUsers(rejected);
    } catch (err) {
      toast({
        title: "Error loading users",
        description: err.message || "You may not have permission to view user profiles.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Action Triggers
  const triggerApprove = (user) => {
    setSelectedUser(user);
    setSelectedRole("receptionist");
    setActionType("approve");
    setRoleDialogOpen(true);
  };

  const triggerChangeRole = (user) => {
    setSelectedUser(user);
    setSelectedRole(user.role || "receptionist");
    setActionType("change_role");
    setRoleDialogOpen(true);
  };

  const triggerReject = (user) => {
    setSelectedUser(user);
    setRejectDialogOpen(true);
  };

  const triggerDeactivate = (user) => {
    setSelectedUser(user);
    setDeactivateDialogOpen(true);
  };

  const triggerReactivate = (user) => {
    setSelectedUser(user);
    setSelectedRole("receptionist");
    setActionType("approve");
    setRoleDialogOpen(true);
  };

  // Submissions
  const handleRoleSubmit = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      if (actionType === "approve") {
        await approveUser(selectedUser.id, selectedRole);
        toast({
          title: "User Approved",
          description: `${selectedUser.full_name || selectedUser.email} is now active as ${selectedRole}.`,
        });
      } else {
        await changeUserRole(selectedUser.id, selectedRole);
        toast({
          title: "Role Changed",
          description: `Role for ${selectedUser.full_name || selectedUser.email} updated to ${selectedRole}.`,
        });
      }
      setRoleDialogOpen(false);
      fetchUsers();
    } catch (err) {
      toast({
        title: "Action failed",
        description: err.message || "Failed to update user profile.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await rejectUser(selectedUser.id);
      toast({
        title: "User Rejected",
        description: `${selectedUser.full_name || selectedUser.email} has been rejected.`,
      });
      setRejectDialogOpen(false);
      fetchUsers();
    } catch (err) {
      toast({
        title: "Action failed",
        description: err.message || "Failed to reject user.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateSubmit = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await deactivateUser(selectedUser.id);
      toast({
        title: "User Deactivated",
        description: `${selectedUser.full_name || selectedUser.email} has been deactivated.`,
      });
      setDeactivateDialogOpen(false);
      fetchUsers();
    } catch (err) {
      toast({
        title: "Action failed",
        description: err.message || "Failed to deactivate user.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Helper formatting
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Manage user roles, access requests, and account statuses"
        icon={UserCheck}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full bg-white/[0.03] border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-gold/30 transition-all text-foreground placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="bg-[#141414] border border-white/5 p-1 mb-6 flex justify-start w-fit">
            <TabsTrigger 
              value="active" 
              className="data-[state=active]:bg-gold/15 data-[state=active]:text-gold px-4 py-2 text-xs font-semibold tracking-wide uppercase"
            >
              Active Users ({activeUsers.length})
            </TabsTrigger>
            <TabsTrigger 
              value="pending" 
              className="data-[state=active]:bg-gold/15 data-[state=active]:text-gold px-4 py-2 text-xs font-semibold tracking-wide uppercase"
            >
              Pending Requests ({pendingUsers.length})
            </TabsTrigger>
            <TabsTrigger 
              value="rejected" 
              className="data-[state=active]:bg-gold/15 data-[state=active]:text-gold px-4 py-2 text-xs font-semibold tracking-wide uppercase"
            >
              Rejected Users ({rejectedUsers.length})
            </TabsTrigger>
          </TabsList>

          {/* Active Users */}
          <TabsContent value="active">
            {activeUsers.filter(u => 
              !search || 
              u.full_name?.toLowerCase().includes(search.toLowerCase()) || 
              u.email?.toLowerCase().includes(search.toLowerCase())
            ).length === 0 ? (
              <div className="glass rounded-2xl">
                <EmptyState 
                  icon={UserCheck} 
                  title={search ? "No matching active users" : "No active users"} 
                  description={search ? "Try searching for a different name or email." : "Approved users will appear here."} 
                />
              </div>
            ) : (
              <div className="glass rounded-2xl overflow-hidden border border-gold/10">
                <div className="overflow-x-auto luxury-scrollbar">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02] text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        <th className="p-4 pl-6">Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 pr-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {activeUsers
                        .filter(u => 
                          !search || 
                          u.full_name?.toLowerCase().includes(search.toLowerCase()) || 
                          u.email?.toLowerCase().includes(search.toLowerCase())
                        )
                        .map((u, i) => (
                          <tr key={u.id} className="hover:bg-white/[0.01] transition-colors animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                            <td className="p-4 pl-6 font-medium text-foreground">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/20 flex items-center justify-center text-gold font-semibold text-xs capitalize">
                                  {(u.full_name || u.email).charAt(0)}
                                </div>
                                <span className="capitalize">{u.full_name || "Unnamed"}</span>
                              </div>
                            </td>
                            <td className="p-4 text-muted-foreground">{u.email}</td>
                            <td className="p-4">
                              <span className="capitalize inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/5 text-xs text-foreground font-medium">
                                <Shield className="w-3 h-3 text-gold" />
                                {u.role || "None"}
                              </span>
                            </td>
                            <td className="p-4">
                              <StatusBadge status={u.status} />
                            </td>
                            <td className="p-4 pr-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {u.status === "suspended" ? (
                                  <GoldButton 
                                    variant="outline" 
                                    className="h-8 text-xs py-1"
                                    onClick={() => triggerReactivate(u)}
                                  >
                                    Re-activate
                                  </GoldButton>
                                ) : (
                                  <>
                                    <GoldButton 
                                      variant="ghost" 
                                      className="h-8 text-xs py-1"
                                      onClick={() => triggerChangeRole(u)}
                                    >
                                      Change Role
                                    </GoldButton>
                                    <button 
                                      onClick={() => triggerDeactivate(u)}
                                      className="h-8 text-xs px-3 py-1 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
                                    >
                                      Deactivate
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Pending Requests */}
          <TabsContent value="pending">
            {pendingUsers.filter(u => 
              !search || 
              u.full_name?.toLowerCase().includes(search.toLowerCase()) || 
              u.email?.toLowerCase().includes(search.toLowerCase())
            ).length === 0 ? (
              <div className="glass rounded-2xl">
                <EmptyState 
                  icon={Mail} 
                  title={search ? "No matching pending requests" : "No pending requests"} 
                  description={search ? "Try searching for a different name or email." : "Access requests from new users will show up here."} 
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {pendingUsers
                  .filter(u => 
                    !search || 
                    u.full_name?.toLowerCase().includes(search.toLowerCase()) || 
                    u.email?.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((u, i) => (
                    <div 
                      key={u.id} 
                      className="glass rounded-2xl p-5 border border-gold/15 hover:border-gold/30 gold-glow-hover animate-fade-up"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold/30 to-gold/5 border border-gold/25 flex items-center justify-center text-gold font-display text-lg font-semibold capitalize">
                          {(u.full_name || u.email).charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-display text-base font-semibold text-foreground truncate capitalize">
                            {u.full_name || "Unnamed Request"}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4 pt-3 border-t border-white/5">
                        <Calendar className="w-3.5 h-3.5 text-gold" />
                        <span>Registered: {formatDate(u.created_date)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-4 pt-1">
                        <GoldButton onClick={() => triggerApprove(u)}>
                          Approve
                        </GoldButton>
                        <button 
                          onClick={() => triggerReject(u)}
                          className="w-full flex items-center justify-center px-4 py-2.5 rounded-lg text-sm border border-red-500/20 text-red-400 hover:bg-red-500/10 active:scale-[0.97] transition-all font-semibold"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>

          {/* Rejected Users */}
          <TabsContent value="rejected">
            {rejectedUsers.filter(u => 
              !search || 
              u.full_name?.toLowerCase().includes(search.toLowerCase()) || 
              u.email?.toLowerCase().includes(search.toLowerCase())
            ).length === 0 ? (
              <div className="glass rounded-2xl">
                <EmptyState 
                  icon={Ban} 
                  title={search ? "No matching rejected users" : "No rejected users"} 
                  description={search ? "Try searching for a different name or email." : "Access requests you reject will appear here."} 
                />
              </div>
            ) : (
              <div className="glass rounded-2xl overflow-hidden border border-white/5">
                <div className="overflow-x-auto luxury-scrollbar">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02] text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        <th className="p-4 pl-6">Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Rejected Date</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 pr-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {rejectedUsers
                        .filter(u => 
                          !search || 
                          u.full_name?.toLowerCase().includes(search.toLowerCase()) || 
                          u.email?.toLowerCase().includes(search.toLowerCase())
                        )
                        .map((u, i) => (
                          <tr key={u.id} className="hover:bg-white/[0.01] transition-colors animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                            <td className="p-4 pl-6 font-medium text-foreground capitalize">{u.full_name || "Unnamed"}</td>
                            <td className="p-4 text-muted-foreground">{u.email}</td>
                            <td className="p-4 text-muted-foreground">{formatDate(u.created_date)}</td>
                            <td className="p-4">
                              <StatusBadge status={u.status} />
                            </td>
                            <td className="p-4 pr-6 text-right">
                              <GoldButton 
                                variant="outline" 
                                className="h-8 text-xs py-1"
                                onClick={() => triggerReactivate(u)}
                              >
                                Approve Request
                              </GoldButton>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Assign / Change Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="glass-strong border-gold/20 max-w-md w-[95%] sm:w-full rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-gold font-semibold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-gold" />
              {actionType === "approve" ? "Assign User Role" : "Change User Role"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Assign a platform role for <span className="text-foreground font-semibold">{selectedUser?.full_name || selectedUser?.email}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <RadioGroup value={selectedRole} onValueChange={setSelectedRole} className="space-y-3">
              <div 
                className="flex items-start space-x-3 rounded-xl border border-white/5 p-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
                onClick={() => setSelectedRole("admin")}
              >
                <RadioGroupItem value="admin" id="role-admin" className="mt-1" />
                <Label htmlFor="role-admin" className="cursor-pointer font-medium text-foreground flex-1">
                  <span>Administrator</span>
                  <span className="block text-xs text-muted-foreground font-normal mt-1 leading-relaxed">
                    Full system access. Can manage properties, rooms, bookings, payments, settings, and other users.
                  </span>
                </Label>
              </div>

              <div 
                className="flex items-start space-x-3 rounded-xl border border-white/5 p-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
                onClick={() => setSelectedRole("receptionist")}
              >
                <RadioGroupItem value="receptionist" id="role-receptionist" className="mt-1" />
                <Label htmlFor="role-receptionist" className="cursor-pointer font-medium text-foreground flex-1">
                  <span>Receptionist</span>
                  <span className="block text-xs text-muted-foreground font-normal mt-1 leading-relaxed">
                    Standard access. Can manage bookings, rooms, customers, and record payments. Cannot access system settings or user management modules.
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <GoldButton variant="ghost" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </GoldButton>
            <GoldButton onClick={handleRoleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {actionType === "approve" ? "Approve & Activate" : "Update Role"}
            </GoldButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="glass-strong border-red-500/20 max-w-md w-[95%] sm:w-full rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-red-400 font-semibold flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-red-400" />
              Reject user request?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
              Are you sure you want to reject the request from <span className="text-foreground font-semibold">{selectedUser?.full_name || selectedUser?.email}</span>? They will not be granted access to the hotel system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <GoldButton variant="ghost" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </GoldButton>
            <button
              onClick={handleRejectSubmit}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all duration-300 bg-red-600 hover:bg-red-700 text-white font-semibold active:scale-[0.97]"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reject
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <DialogContent className="glass-strong border-red-500/20 max-w-md w-[95%] sm:w-full rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-red-400 font-semibold flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-400" />
              Deactivate user account?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
              Are you sure you want to deactivate <span className="text-foreground font-semibold">{selectedUser?.full_name || selectedUser?.email}</span>? They will lose access to the platform immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <GoldButton variant="ghost" onClick={() => setDeactivateDialogOpen(false)}>
              Cancel
            </GoldButton>
            <button
              onClick={handleDeactivateSubmit}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all duration-300 bg-red-600 hover:bg-red-700 text-white font-semibold active:scale-[0.97]"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Deactivate
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
