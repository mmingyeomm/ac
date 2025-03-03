use anchor_lang::prelude::*;

declare_id!("9zuEtiy6MeucRyUTkUTy8ydX9A35cKBawnrHkU3CULvf");

use anchor_lang::prelude::*;

#[program]
pub mod simple_deposit {
    use super::*;

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let depositor = &mut ctx.accounts.depositor;
        let vault = &mut ctx.accounts.vault;


        Ok(())
}
}

#[account]
pub struct Depositor {
    pub bump: u8,
}

#[account]
pub struct Vault {
    pub balance: u64,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,
    #[account(init, payer = depositor, space = 8 + 8, seeds = [b"vault"], bump)]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}