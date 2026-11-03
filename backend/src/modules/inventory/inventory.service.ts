import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryStatus, MovementType, ReferenceType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { FindInventoryQueryDto } from './dto/find-inventory-query.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateInventoryDto) {
    if (dto.maximumStock < dto.minimumStock) {
      throw new BadRequestException('Maximum stock cannot be less than minimum stock');
    }
    if (dto.reorderLevel > dto.maximumStock) {
      throw new BadRequestException('Reorder level cannot exceed maximum stock');
    }

    const store = await this.prisma.store.findFirst({
      where: { id: dto.storeId, tenantId },
    });
    if (!store) {
      throw new NotFoundException('Store not found or does not belong to tenant');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId },
    });
    if (!product) {
      throw new NotFoundException('Product not found or does not belong to tenant');
    }

    const exists = await this.prisma.inventory.findUnique({
      where: {
        storeId_productId: {
          storeId: dto.storeId,
          productId: dto.productId,
        },
      },
    });

    if (exists) {
      if (exists.status === InventoryStatus.ACTIVE) {
        throw new ConflictException('Inventory record already exists for this product in this store');
      }

      // Reactivate
      const reactivated = await this.prisma.inventory.update({
        where: { id: exists.id },
        data: {
          quantityOnHand: dto.quantityOnHand,
          minimumStock: dto.minimumStock,
          maximumStock: dto.maximumStock,
          reorderLevel: dto.reorderLevel,
          reservedQuantity: 0,
          status: InventoryStatus.ACTIVE,
        },
      });

      return this.findOne(tenantId, reactivated.id);
    }

    const created = await this.prisma.inventory.create({
      data: {
        tenantId,
        storeId: dto.storeId,
        productId: dto.productId,
        quantityOnHand: dto.quantityOnHand,
        minimumStock: dto.minimumStock,
        maximumStock: dto.maximumStock,
        reorderLevel: dto.reorderLevel,
      },
    });

    return this.findOne(tenantId, created.id);
  }

  async findAll(tenantId: string, query: FindInventoryQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      storeId,
      productId,
      status,
      stockLevel,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (status) {
      where.status = status;
    }
    if (storeId) {
      where.storeId = storeId;
    }
    if (productId) {
      where.productId = productId;
    }

    if (stockLevel === 'OUT_OF_STOCK') {
      where.quantityOnHand = { lte: 0 };
    } else if (stockLevel === 'LOW_STOCK') {
      where.quantityOnHand = { gt: 0, lte: 10 };
    } else if (stockLevel === 'IN_STOCK') {
      where.quantityOnHand = { gt: 0 };
    }

    if (search) {
      where.OR = [
        { product: { name: { contains: search, mode: 'insensitive' } } },
        { product: { sku: { contains: search, mode: 'insensitive' } } },
        { product: { barcode: { contains: search, mode: 'insensitive' } } },
        { store: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    let orderBy: any = { [sortBy]: sortOrder };
    if (sortBy === 'productName') {
      orderBy = { product: { name: sortOrder } };
    } else if (sortBy === 'storeName') {
      orderBy = { store: { name: sortOrder } };
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.inventory.count({ where }),
      this.prisma.inventory.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: this.getIncludeFields(),
      }),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    const inventory = await this.prisma.inventory.findFirst({
      where: { id, tenantId },
      include: this.getIncludeFields(),
    });

    if (!inventory) {
      throw new NotFoundException('Inventory record not found');
    }

    return inventory;
  }

  async update(tenantId: string, id: string, dto: UpdateInventoryDto) {
    const inventory = await this.prisma.inventory.findFirst({
      where: { id, tenantId },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory record not found');
    }

    const minStock = dto.minimumStock !== undefined ? dto.minimumStock : Number(inventory.minimumStock);
    const maxStock = dto.maximumStock !== undefined ? dto.maximumStock : Number(inventory.maximumStock);
    const reorder = dto.reorderLevel !== undefined ? dto.reorderLevel : Number(inventory.reorderLevel);

    if (maxStock < minStock) {
      throw new BadRequestException('Maximum stock cannot be less than minimum stock');
    }
    if (reorder > maxStock) {
      throw new BadRequestException('Reorder level cannot exceed maximum stock');
    }

    await this.prisma.inventory.update({
      where: { id },
      data: {
        quantityOnHand: dto.quantityOnHand,
        reservedQuantity: dto.reservedQuantity,
        minimumStock: dto.minimumStock,
        maximumStock: dto.maximumStock,
        reorderLevel: dto.reorderLevel,
        status: dto.status,
      },
    });

    return this.findOne(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    const inventory = await this.prisma.inventory.findFirst({
      where: { id, tenantId },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory record not found');
    }

    await this.prisma.inventory.update({
      where: { id },
      data: { status: InventoryStatus.INACTIVE },
    });

    return this.findOne(tenantId, id);
  }

  async getExportData(tenantId: string, storeId?: string) {
    const where: any = { tenantId, status: InventoryStatus.ACTIVE };
    if (storeId) {
      where.storeId = storeId;
    }

    const items = await this.prisma.inventory.findMany({
      where,
      orderBy: [
        { store: { name: 'asc' } },
        { product: { name: 'asc' } },
      ],
      include: {
        store: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        product: {
          select: {
            id: true,
            sku: true,
            barcode: true,
            name: true,
            category: true,
            unit: true,
            costPrice: true,
            sellingPrice: true,
            status: true,
          },
        },
      },
    });

    return items.map((inv) => ({
      inventoryId: inv.id,
      storeId: inv.storeId,
      storeCode: inv.store.code,
      storeName: inv.store.name,
      productId: inv.productId,
      sku: inv.product.sku,
      barcode: inv.product.barcode || '',
      productName: inv.product.name,
      category: inv.product.category || 'General',
      unit: inv.product.unit || 'pcs',
      costPrice: Number(inv.product.costPrice),
      sellingPrice: Number(inv.product.sellingPrice),
      currentStock: Number(inv.quantityOnHand),
      quantityToAdd: 0,
      editExistingStock: '',
      minimumStock: Number(inv.minimumStock),
      maximumStock: Number(inv.maximumStock),
      reorderLevel: Number(inv.reorderLevel),
      status: inv.status,
    }));
  }

  async bulkImport(
    tenantId: string,
    currentUserId: string,
    items: any[],
    mode: 'ADD' | 'SET' = 'ADD',
    defaultStoreId?: string,
  ) {
    let updatedCount = 0;
    let createdCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    let performerId = currentUserId;
    if (!performerId) {
      const fallbackUser = await this.prisma.user.findFirst({
        where: { tenantId },
        select: { id: true },
      });
      performerId = fallbackUser?.id || '';
    }

    // 1. Pre-fetch all active stores for tenant
    const stores = await this.prisma.store.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: { id: true, code: true, name: true },
    });

    const storeById = new Map<string, typeof stores[0]>();
    const storeByCode = new Map<string, typeof stores[0]>();
    const storeByName = new Map<string, typeof stores[0]>();

    for (const s of stores) {
      storeById.set(s.id.toLowerCase(), s);
      storeByCode.set(s.code.toUpperCase(), s);
      storeByName.set(s.name.toUpperCase(), s);
    }

    const defaultStore = defaultStoreId
      ? storeById.get(defaultStoreId.toLowerCase())
      : stores.length === 1
      ? stores[0]
      : undefined;

    // 2. Pre-fetch all products for tenant
    const products = await this.prisma.product.findMany({
      where: { tenantId },
      select: { id: true, sku: true, barcode: true, name: true, status: true },
    });

    const productById = new Map<string, typeof products[0]>();
    const productBySku = new Map<string, typeof products[0]>();
    const productByBarcode = new Map<string, typeof products[0]>();

    for (const p of products) {
      productById.set(p.id.toLowerCase(), p);
      productBySku.set(p.sku.toUpperCase(), p);
      if (p.barcode) {
        productByBarcode.set(p.barcode.toUpperCase(), p);
      }
    }

    // 3. Pre-fetch existing inventories for tenant
    const existingInventories = await this.prisma.inventory.findMany({
      where: { tenantId },
      select: {
        id: true,
        storeId: true,
        productId: true,
        quantityOnHand: true,
        minimumStock: true,
        maximumStock: true,
        reorderLevel: true,
        status: true,
      },
    });

    const inventoryMap = new Map<string, typeof existingInventories[0]>();
    for (const inv of existingInventories) {
      inventoryMap.set(`${inv.storeId.toLowerCase()}_${inv.productId.toLowerCase()}`, inv);
    }

    // Process each row
    for (let index = 0; index < items.length; index++) {
      const row = items[index];
      const rowNum = index + 1;

      // Identify store
      let targetStore = defaultStore;
      const rawStoreId = row.storeId || row.store_id || row.storeid;
      const rawStoreCode = row.storeCode || row.store_code || row.storecode;
      const rawStoreName = row.storeName || row.store_name || row.storename || row.store || row.shop || row.branch;

      if (rawStoreId && storeById.has(String(rawStoreId).toLowerCase())) {
        targetStore = storeById.get(String(rawStoreId).toLowerCase());
      } else if (rawStoreCode && storeByCode.has(String(rawStoreCode).trim().toUpperCase())) {
        targetStore = storeByCode.get(String(rawStoreCode).trim().toUpperCase());
      } else if (rawStoreName) {
        const trimmedName = String(rawStoreName).trim().toUpperCase();
        if (storeByName.has(trimmedName)) {
          targetStore = storeByName.get(trimmedName);
        } else if (storeByCode.has(trimmedName)) {
          targetStore = storeByCode.get(trimmedName);
        }
      }

      if (!targetStore) {
        errors.push(`Row ${rowNum}: Store not found (Store: "${rawStoreCode || rawStoreName || rawStoreId || 'None specified'}").`);
        skippedCount++;
        continue;
      }

      // Identify product
      let targetProduct: typeof products[0] | undefined;
      const rawProductId = row.productId || row.product_id || row.productid;
      const rawSku = row.sku || row.productSku || row.product_sku || row.code;
      const rawBarcode = row.barcode || row.upc || row.ean;

      if (rawProductId && productById.has(String(rawProductId).toLowerCase())) {
        targetProduct = productById.get(String(rawProductId).toLowerCase());
      } else if (rawSku && productBySku.has(String(rawSku).trim().toUpperCase())) {
        targetProduct = productBySku.get(String(rawSku).trim().toUpperCase());
      } else if (rawBarcode && productByBarcode.has(String(rawBarcode).trim().toUpperCase())) {
        targetProduct = productByBarcode.get(String(rawBarcode).trim().toUpperCase());
      }

      if (!targetProduct) {
        errors.push(`Row ${rowNum}: Product not found (ID: "${rawProductId || ''}", SKU: "${rawSku || ''}", Barcode: "${rawBarcode || ''}").`);
        skippedCount++;
        continue;
      }

      // Parse quantities
      const parseNum = (val: any) => {
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          const n = parseFloat(String(val));
          if (!isNaN(n)) return n;
        }
        return undefined;
      };

      const qtyToAdd = parseNum(row.quantityToAdd ?? row.quantity_to_add ?? row.addQuantity ?? row.add_quantity ?? row.addStock ?? row.add_stock);
      const newStockVal = parseNum(
        row.editExistingStock ??
        row.edit_existing_stock ??
        row.editStock ??
        row.edit_stock ??
        row.setStock ??
        row.set_stock ??
        row.newStock ??
        row.new_stock
      );
      const minStockVal = parseNum(row.minimumStock ?? row.minimum_stock ?? row.minStock ?? row.min_stock);
      const maxStockVal = parseNum(row.maximumStock ?? row.maximum_stock ?? row.maxStock ?? row.max_stock);
      const reorderVal = parseNum(row.reorderLevel ?? row.reorder_level ?? row.reorder);

      const invKey = `${targetStore.id.toLowerCase()}_${targetProduct.id.toLowerCase()}`;
      const existing = inventoryMap.get(invKey);

      try {
        if (existing) {
          // Update existing inventory
          const currentQty = Number(existing.quantityOnHand);
          let finalQty = currentQty;
          if (newStockVal !== undefined) {
            // User explicitly set EditExistingStock (e.g. 75)
            finalQty = newStockVal + (qtyToAdd && qtyToAdd > 0 ? qtyToAdd : 0);
          } else if (qtyToAdd !== undefined) {
            if (mode === 'SET') {
              finalQty = qtyToAdd;
            } else {
              finalQty = currentQty + qtyToAdd;
            }
          }

          if (finalQty < 0) {
            errors.push(`Row ${rowNum} (${targetProduct.name}): Resulting stock cannot be negative (${finalQty}).`);
            skippedCount++;
            continue;
          }

          const deltaQty = finalQty - currentQty;

          await this.prisma.$transaction(async (tx) => {
            const updatedInv = await tx.inventory.update({
              where: { id: existing.id },
              data: {
                quantityOnHand: finalQty,
                minimumStock: minStockVal !== undefined ? minStockVal : existing.minimumStock,
                maximumStock: maxStockVal !== undefined ? maxStockVal : existing.maximumStock,
                reorderLevel: reorderVal !== undefined ? reorderVal : existing.reorderLevel,
                status: InventoryStatus.ACTIVE,
              },
            });

            // Record stock movement if quantity changed
            if (deltaQty !== 0) {
              await tx.stockMovement.create({
                data: {
                  tenantId,
                  storeId: targetStore.id,
                  productId: targetProduct.id,
                  inventoryId: existing.id,
                  referenceType: ReferenceType.ADJUSTMENT,
                  referenceId: `BULK-IMPORT-${Date.now()}`,
                  movementType: MovementType.ADJUSTMENT,
                  quantity: deltaQty,
                  balanceBefore: currentQty,
                  balanceAfter: finalQty,
                  remarks: `Bulk stock import (${deltaQty > 0 ? '+' : ''}${deltaQty} units into ${targetStore.name})`,
                  performedBy: performerId,
                },
              });
            }

            // Update cache
            inventoryMap.set(invKey, {
              ...existing,
              quantityOnHand: updatedInv.quantityOnHand,
              status: InventoryStatus.ACTIVE,
            });
          });

          updatedCount++;
        } else {
          // Product exists in catalog, but no inventory in this store yet -> Add to store inventory!
          let initialQty = 0;
          if (newStockVal !== undefined) {
            initialQty = Math.max(0, newStockVal);
          } else if (qtyToAdd !== undefined) {
            initialQty = Math.max(0, qtyToAdd);
          }

          const minS = minStockVal !== undefined ? minStockVal : 5;
          const maxS = maxStockVal !== undefined ? maxStockVal : 1000;
          const reorderS = reorderVal !== undefined ? reorderVal : 10;

          await this.prisma.$transaction(async (tx) => {
            const newInv = await tx.inventory.create({
              data: {
                tenantId,
                storeId: targetStore.id,
                productId: targetProduct.id,
                quantityOnHand: initialQty,
                minimumStock: minS,
                maximumStock: maxS,
                reorderLevel: reorderS,
                status: InventoryStatus.ACTIVE,
              },
            });

            if (initialQty > 0) {
              await tx.stockMovement.create({
                data: {
                  tenantId,
                  storeId: targetStore.id,
                  productId: targetProduct.id,
                  inventoryId: newInv.id,
                  referenceType: ReferenceType.ADJUSTMENT,
                  referenceId: `BULK-IMPORT-${Date.now()}`,
                  movementType: MovementType.ADJUSTMENT,
                  quantity: initialQty,
                  balanceBefore: 0,
                  balanceAfter: initialQty,
                  remarks: `Bulk stock import initial store assignment (${targetStore.name})`,
                  performedBy: performerId,
                },
              });
            }

            inventoryMap.set(invKey, {
              id: newInv.id,
              storeId: targetStore.id,
              productId: targetProduct.id,
              quantityOnHand: newInv.quantityOnHand,
              minimumStock: newInv.minimumStock,
              maximumStock: newInv.maximumStock,
              reorderLevel: newInv.reorderLevel,
              status: InventoryStatus.ACTIVE,
            });
          });

          createdCount++;
        }
      } catch (err: any) {
        errors.push(`Row ${rowNum} (${targetProduct.name}): ${err.message}`);
        skippedCount++;
      }
    }

    return {
      updatedCount,
      createdCount,
      skippedCount,
      totalProcessed: items.length,
      errors: errors.slice(0, 50),
    };
  }

  private getIncludeFields() {
    return {
      store: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          unit: true,
          status: true,
        },
      },
    };
  }
}
