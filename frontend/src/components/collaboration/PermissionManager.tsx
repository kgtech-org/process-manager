'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Permission, PermissionResource, PermissionLevel } from '@/lib/resources';

interface PermissionManagerProps {
  documentId: string;
}

export function PermissionManager({ documentId }: PermissionManagerProps) {
  const { t } = useTranslation('collaboration');
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; permission: Permission | null }>({
    open: false,
    permission: null,
  });

  useEffect(() => {
    loadPermissions();
  }, [documentId]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const data = await PermissionResource.getDocumentPermissions(documentId);
      setPermissions(data);
    } catch (error: any) {
      toast({
        title: t('permissions.loadError'),
        description: error.response?.data?.message || t('permissions.loadFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermission = async (userId: string, newLevel: PermissionLevel) => {
    try {
      await PermissionResource.update(documentId, userId, { level: newLevel });

      toast({
        title: t('permissions.updateSuccess'),
        description: t('permissions.permissionUpdated'),
      });

      // Update local state
      setPermissions(
        permissions.map((p) => (p.userId === userId ? { ...p, level: newLevel } : p))
      );
    } catch (error: any) {
      toast({
        title: t('permissions.updateError'),
        description: error.response?.data?.message || t('permissions.updateFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleDeletePermission = async () => {
    if (!deleteConfirm.permission) return;

    try {
      await PermissionResource.delete(documentId, deleteConfirm.permission.userId);

      toast({
        title: t('permissions.deleteSuccess'),
        description: t('permissions.permissionDeleted'),
      });

      // Update local state
      setPermissions(permissions.filter((p) => p.userId !== deleteConfirm.permission?.userId));
      setDeleteConfirm({ open: false, permission: null });
    } catch (error: any) {
      toast({
        title: t('permissions.deleteError'),
        description: error.response?.data?.message || t('permissions.deleteFailed'),
        variant: 'destructive',
      });
    }
  };

  const getPermissionBadgeVariant = (level: PermissionLevel): any => {
    switch (level) {
      case 'admin':
        return 'destructive';
      case 'sign':
        return 'default';
      case 'write':
        return 'secondary';
      case 'read':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('permissions.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500">{t('permissions.loading')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('permissions.title')}</CardTitle>
          <CardDescription>{t('permissions.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {permissions.length === 0 ? (
            <p className="text-center text-gray-500 py-4">{t('permissions.noPermissions')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('permissions.user')}</TableHead>
                  <TableHead>{t('permissions.email')}</TableHead>
                  <TableHead>{t('permissions.level')}</TableHead>
                  <TableHead>{t('permissions.grantedBy')}</TableHead>
                  <TableHead>{t('permissions.grantedAt')}</TableHead>
                  <TableHead className="text-right">{t('permissions.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((permission) => (
                  <TableRow key={permission.id}>
                    <TableCell className="font-medium">{permission.userName || 'Unknown'}</TableCell>
                    <TableCell>{permission.userEmail}</TableCell>
                    <TableCell>
                      <Select
                        value={permission.level}
                        onValueChange={(value: PermissionLevel) =>
                          handleUpdatePermission(permission.userId, value)
                        }
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue>
                            <Badge variant={getPermissionBadgeVariant(permission.level)}>
                              {t(`permissions.levels.${permission.level}`)}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read">
                            {t('permissions.levels.read')}
                          </SelectItem>
                          <SelectItem value="write">
                            {t('permissions.levels.write')}
                          </SelectItem>
                          <SelectItem value="sign">
                            {t('permissions.levels.sign')}
                          </SelectItem>
                          <SelectItem value="admin">
                            {t('permissions.levels.admin')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{permission.grantedByName || 'Unknown'}</TableCell>
                    <TableCell>
                      {new Date(permission.grantedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm({ open: true, permission })}
                      >
                        {t('permissions.remove')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('permissions.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('permissions.confirmDeleteMessage', {
                user: deleteConfirm.permission?.userName || deleteConfirm.permission?.userEmail,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('permissions.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePermission}>
              {t('permissions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
